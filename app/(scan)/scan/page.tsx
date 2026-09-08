'use client';

// De app is een reeks van vijf stappen: data aanleveren, de vragenlijst,
// kenmerken koppelen, vragensets valideren, rapport.
//
// Die volgorde is niet cosmetisch. De sets kunnen pas bestaan als de data er is,
// want ze gaan over de eigen categorieen van de merchant (S6). En de bank komt
// daar tussen omdat de vragen niet uit die data volgen maar uit onderzoek naar de
// markt: zou de bank onzichtbaar blijven, dan krijgt een merchant een cijfer
// zonder te zien waarlangs hij gemeten is, en zonder te weten dat die lat
// voorlopig kan zijn.

import { useEffect, useState } from 'react';
import type { Dataset, QuestionSetState, ScanReport } from '../../../src/domain/types';
import { generateQuestionSets } from '../../../src/questions/generate';
import type { Mapping } from '../../../src/questions/mapping';
import { bankStore, LOCAL_ACCOUNT, type StoredBank } from '../../../src/storage/banks';
import type { ScanClient } from '../../../src/worker/client';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { UploadStep } from '../../../components/UploadStep';
import { SegmentStep } from '../../../components/SegmentStep';
import { pathsFromProducts, type Verdicts } from '../../../src/intake/facets';
// Het categoriepad kent de motor al; `facets` krijgt het als argument, zodat de
// intake niet van de engine hoeft af te hangen.
import { categoryPath } from '../../../src/engine/join';
import { BankStep } from '../../../components/BankStep';
import { MappingStep } from '../../../components/MappingStep';
import { QuestionSetStep } from '../../../components/QuestionSetStep';
import { ReportView } from '../../../components/ReportView';

type Step = 'upload' | 'segments' | 'bank' | 'mapping' | 'questions' | 'report';

export default function Home() {
  const [locale] = useLocale();
  const [step, setStep] = useState<Step>('upload');
  const [catalog, setCatalog] = useState<Dataset>();
  const [banks, setBanks] = useState<StoredBank[]>([]);
  const [questionState, setQuestionState] = useState<QuestionSetState>();
  // De koppeling van kenmerk naar kolom. Hij hoort bij deze catalogus en niet bij
  // de vragenlijst, want de kolomnamen zijn van de merchant; hij wordt daarom op
  // de bank gelegd op het moment van samenstellen en niet erin bewaard.
  const [mapping, setMapping] = useState<Mapping>({});
  // Welke vragenset uit de lijst bij welke eigen categorie hoort. Zonder deze
  // keuze beslist alleen de regex, en die faalt zodra de lijst zijn categorieën
  // anders noemt dan de catalogus.
  const [categories, setCategories] = useState<Record<string, string | null>>({});
  /** Wat de merchant zelf over zijn categoriepaden zei; zie SegmentStep. */
  const [verdicts, setVerdicts] = useState<Verdicts>({});
  const [report, setReport] = useState<ScanReport>();
  // De client houdt de worker vast; de datasets blijven daar zodat ze niet voor
  // elke scan opnieuw door de structured clone hoeven.
  const [client, setClient] = useState<ScanClient>();
  const [scanning, setScanning] = useState(false);
  // Een knop die stil faalt is erger dan een knop die een fout toont: dan denkt
  // een merchant dat hij verkeerd geklikt heeft.
  const [scanError, setScanError] = useState<string>();

  const s = STRINGS[locale];
  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: s.steps.upload },
    { id: 'segments', label: s.steps.segments },
    { id: 'bank', label: s.steps.bank },
    { id: 'mapping', label: s.steps.mapping },
    { id: 'questions', label: s.steps.questions },
    { id: 'report', label: s.steps.report },
  ];

  // Eerder ingelezen banken staan op dit apparaat; ze horen er meteen te zijn,
  // anders draait de eerste scan van een sessie op de terugval terwijl er allang
  // een onderzochte bank ligt.
  useEffect(() => {
    void bankStore.list(LOCAL_ACCOUNT).then((stored) => {
      setBanks(stored);
      // De koppeling van de vorige keer hoort er meteen te zijn, anders begint
      // elke sessie opnieuw met tientallen ongekoppelde kenmerken.
      const saved = stored.find((entry) => entry.mapping || entry.categories);
      if (saved?.mapping) setMapping(saved.mapping);
      if (saved?.categories) setCategories(saved.categories);
    });
  }, []);

  /** Stel de sets opnieuw samen; elke bank- of koppelwijziging verandert de vragen. */
  function compose(
    nextBanks: StoredBank[],
    nextCatalog = catalog,
    nextMapping = mapping,
    nextCategories = categories,
  ) {
    if (!nextCatalog) return;
    setQuestionState(generateQuestionSets(
      nextCatalog,
      nextBanks.map((entry) => entry.bank),
      nextMapping,
      nextCategories,
    ));
  }

  /** Een gewijzigde koppeling verandert waar elk kenmerk op uitkomt. */
  /**
   * Bewaar de koppeling bij de vragenlijst waar hij bij hoort.
   *
   * Bij elke wijziging en niet pas aan het eind: wie halverwege wegklikt hoort
   * zijn werk terug te vinden. Alleen namen gaan mee — kenmerksleutel, kolomnaam,
   * categorienaam — dus de belofte dat de catalogus het apparaat niet verlaat
   * blijft overeind.
   */
  function remember(nextMapping: Mapping, nextCategories: Record<string, string | null>) {
    for (const entry of banks) {
      void bankStore.save({ ...entry, mapping: nextMapping, categories: nextCategories });
    }
  }

  function handleMapping(next: Mapping) {
    setMapping(next);
    compose(banks, catalog, next);
    remember(next, categories);
  }

  /** Een andere vragenset per categorie verandert wélke vragen er gesteld worden. */
  function handleCategories(next: Record<string, string | null>) {
    setCategories(next);
    compose(banks, catalog, mapping, next);
    remember(mapping, next);
  }

  function handleReady(nextClient: ScanClient, nextCatalog: Dataset) {
    setClient(nextClient);
    setCatalog(nextCatalog);
    compose(banks, nextCatalog);
    setStep('segments');
  }

  async function handleImport(entry: StoredBank) {
    // Een nieuwe lijst brengt eigen categorieën mee, dus de oude keuzes wijzen
    // naar sets die er misschien niet meer zijn. Ze meenemen zou stilzwijgend op
    // "alleen de algemene vragen" uitkomen; leegmaken laat de koppeling opnieuw
    // lopen. De kenmerkkoppeling blijft wél staan: die hangt aan kolomnamen, en
    // die zijn niet veranderd.
    setCategories({});
    await bankStore.save({ ...entry, mapping, categories: {} });
    const next = await bankStore.list(LOCAL_ACCOUNT);
    setBanks(next);
    compose(next);
  }

  async function handleRemoveBank(vertical: string) {
    await bankStore.remove(LOCAL_ACCOUNT, vertical);
    const next = await bankStore.list(LOCAL_ACCOUNT);
    setBanks(next);
    compose(next);
  }

  async function handleRun() {
    if (!client || !questionState) return;
    setScanning(true);
    setScanError(undefined);
    try {
      // De klok komt van hier: de motor heeft er zelf geen.
      setReport(await client.scan(questionState, new Date().toISOString()));
      setStep('report');
    } catch (caught) {
      setScanError((caught as Error).message);
    } finally {
      setScanning(false);
    }
  }

  function restart() {
    setCatalog(undefined);
    setQuestionState(undefined); setReport(undefined); setMapping({}); setCategories({});
    client?.dispose(); setClient(undefined);
    setStep('upload');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{steps.find((x) => x.id === step)?.label}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{s.tagline}</p>

        <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {steps.map((entry, index) => {
            const done = steps.findIndex((x) => x.id === step) > index;
            const current = entry.id === step;
            return (
              <li key={entry.id} className="flex items-center gap-2">
                {index > 0 ? <span className="text-muted">→</span> : null}
                <span
                  className={
                    current ? 'font-medium text-ink'
                      : done ? 'text-ok'
                      : 'text-muted'
                  }
                >
                  {done ? '✓ ' : ''}{entry.label}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <main>
        {step === 'upload' ? <UploadStep s={s} onReady={handleReady} /> : null}

        {step === 'segments' && catalog ? (
          <SegmentStep
            s={s}
            locale={locale}
            paths={pathsFromProducts(catalog.products, categoryPath)}
            verdicts={verdicts}
            onChange={setVerdicts}
            onContinue={() => setStep('bank')}
          />
        ) : null}

        {step === 'bank' && questionState ? (
          <BankStep
            s={s}
            locale={locale}
            stored={banks}
            onImport={(entry) => void handleImport(entry)}
            onRemove={(vertical) => void handleRemoveBank(vertical)}
            onContinue={() => setStep('mapping')}
          />
        ) : null}

        {step === 'mapping' && catalog && questionState ? (
          <MappingStep
            s={s}
            locale={locale}
            catalog={catalog}
            state={questionState}
            mapping={mapping}
            onChange={handleMapping}
            categories={categories}
            onCategories={handleCategories}
            onContinue={() => setStep('questions')}
          />
        ) : null}

        {step === 'questions' && catalog && questionState ? (
          <QuestionSetStep
            s={s}
            locale={locale}
            catalog={catalog}
            state={questionState}
            onChange={setQuestionState}
            onRun={() => void handleRun()}
            running={scanning}
            error={scanError}
          />
        ) : null}

        {step === 'report' && report ? (
          <ReportView s={s} locale={locale} report={report} onRestart={restart} />
        ) : null}
      </main>
    </div>
  );
}
