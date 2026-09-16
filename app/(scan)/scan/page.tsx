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

import { useEffect, useMemo, useState, useRef } from 'react';
import type { Dataset, QuestionSetState, ScanReport } from '../../../src/domain/types';
import { generateQuestionSets } from '../../../src/questions/generate';
import { importQuestionList } from '../../../src/questions/list';
import { applyAttributeShapes, applyOverlaySettings, excludeFromScore } from '../../../src/questions/bank';
import { applyImportanceCorrections } from '../../../src/questions/critical';
import type { Mapping } from '../../../src/questions/mapping';
import { bankStore, LOCAL_ACCOUNT, type StoredBank } from '../../../src/storage/banks';
import { LocalSettingsStore, SupabaseSettingsStore, type SettingsStore } from '../../../src/storage/settings';
import { applyWork, mergeWork, setKey, type QuestionWork } from '../../../src/questions/work';
import type { ScanClient } from '../../../src/worker/client';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { UploadStep } from '../../../components/UploadStep';
import { SegmentStep } from '../../../components/SegmentStep';
import { applyVerdicts, classifyPaths, normalizeName, pathKey, pathsFromProducts, type PathKind, type Verdicts } from '../../../src/intake/facets';
import { authHeader, supabase } from '../../../src/auth/client';
import { NoVerdictStore, SupabaseVerdictStore, type VerdictStore } from '../../../src/storage/verdicts';
// Het categoriepad kent de motor al; `facets` krijgt het als argument, zodat de
// intake niet van de engine hoeft af te hangen.
import { categoryPath, segmentAt } from '../../../src/engine/join';
import { BankStep } from '../../../components/BankStep';
import { WaitingStep } from '../../../components/WaitingStep';
import { BankRequestForm } from '../../../components/BankRequestForm';
import { useAuth } from '../../../components/auth/AuthProvider';
import { MappingStep } from '../../../components/MappingStep';
import { CategorySetsCard } from '../../../components/CategorySetsCard';
import { QuestionSetStep } from '../../../components/QuestionSetStep';
import { ReportView } from '../../../components/ReportView';

type Step = 'upload' | 'segments' | 'bank' | 'mapping' | 'questions' | 'report';

export default function Home() {
  const [locale] = useLocale();
  const [step, setStep] = useState<Step>('upload');
  /** De vraag waar het rapport naar verwees, zodat het vragensetscherm erop opent. */
  const [focusQuestion, setFocusQuestion] = useState<{ setId: string; questionId: string; base: boolean }>();
  /** Vanuit een bewaarde analyse: de vraag staat in het adres, want de catalogus moet eerst opnieuw in. */
  const [fromSaved, setFromSaved] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionId = params.get('vraag');
    const setId = params.get('set');
    if (!questionId || !setId) return;
    void (async () => {
      await Promise.resolve();
      setFocusQuestion({ questionId, setId, base: params.get('algemeen') === '1' });
      setFromSaved(true);
    })();
  }, []);
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
  /**
   * De nieuwste koppeling en categoriekeuze, buiten de render om.
   *
   * Het koppelscherm vraagt voorstellen in blokken op, en dat duurt bij een grote
   * bank een minuut. Elk blok dat binnenkomt riep een handler aan uit de render
   * waarin het begon — met de categoriekeuze van toen. Dan stelde die de sets
   * opnieuw samen op de oude keuze en bewaarde hem ook nog: een keuze van de
   * merchant sprong terug zodra het volgende blok landde. Wat hier staat is altijd
   * de stand van nu, hoe oud de aanroeper ook is.
   */
  const latest = useRef<{
    mapping: Mapping;
    categories: Record<string, string | null>;
    /** Wat de merchant op de vragensets deed; zie `src/questions/work.ts`. */
    work?: QuestionWork;
    /** De laatste samenstelling zonder dat werk erover, om het werk uit te halen. */
    pristine?: QuestionSetState;
  }>({ mapping: {}, categories: {} });
  /** Categorieën die opnieuw bevestigd moeten worden omdat de bank ze veranderde. */
  const [reconfirm, setReconfirm] = useState<{ categories: string[]; base: boolean }>({ categories: [], base: false });
  const [saveFailed, setSaveFailed] = useState(false);
  const storeMapping = (next: Mapping) => { latest.current.mapping = next; setMapping(next); };
  const storeCategories = (next: Record<string, string | null>) => { latest.current.categories = next; setCategories(next); };
  /** Wat de merchant zelf over zijn categoriepaden zei; zie SegmentStep. */
  const [verdicts, setVerdicts] = useState<Verdicts>({});
  const { user, accountId } = useAuth();
  /**
   * Waar het oordeel van de merchant blijft staan.
   *
   * Zonder dit vraagt elke scan het opnieuw, en het voorstel dat hij dan krijgt
   * kan anders zijn — gemeten wisselden 8 van de 54 paden tussen drie identieke
   * aanroepen. Twee rapporten zouden dan op verschillende definities rusten.
   */
  const store = useMemo<VerdictStore>(() => {
    const client = supabase();
    return client ? new SupabaseVerdictStore(client) : new NoVerdictStore();
  }, []);

  /**
   * Waar koppeling, categoriekeuze en het werk op de vragensets blijven staan.
   *
   * In het account zodra er een is, zodat de merchant op een andere laptop of
   * over drie maanden verder kan. Zonder login in de browser: dan is het werk er
   * de volgende sessie op dit apparaat nog.
   */
  const settingsStore = useMemo<SettingsStore>(() => {
    const client = supabase();
    return client && accountId ? new SupabaseSettingsStore(client) : new LocalSettingsStore();
  }, [accountId]);

  // Wat hij eerder besliste ophalen zodra we weten bij welk account hij hoort.
  // Zijn eerdere oordeel wint van wat er nu in het scherm staat: dat is precies
  // waarvoor het bewaard werd.
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    void (async () => {
      await Promise.resolve();
      const stored = await store.list(accountId);
      if (alive && Object.keys(stored).length > 0) {
        setVerdicts((current) => ({ ...current, ...stored }));
      }
    })();
    return () => { alive = false; };
  }, [accountId, store]);

  /**
   * Eén keuze vastleggen, en meteen bewaren.
   *
   * Bewaren per keuze en niet aan het eind: wie halverwege wegklikt heeft zijn
   * werk anders voor niets gedaan, en dan begint hij de volgende keer opnieuw
   * met een voorstel dat anders kan zijn.
   */
  function decideCategory(segments: string[], kind: PathKind) {
    const key = pathKey(segments);
    setVerdicts((current) => ({ ...current, [key]: kind }));
    if (accountId) void store.save(accountId, { pathKey: key, segments, kind });
  }

  /**
   * Een vragenset niet meenemen, vanaf het vragensetscherm.
   *
   * Langs dezelfde weg als "Uitgesloten" op het categoriescherm: het oordeel over
   * het pad wordt bewaard, en de sets worden opnieuw samengesteld zonder die
   * categorie. Zo werkt het overal door — geen vragen, geen kenmerken, en haar
   * producten tellen niet mee. Een subcategorie wordt gezocht onder haar eigen
   * categorie, zodat "Paneel" onder Gordijnstoffen niet ook elders verdwijnt.
   */
  function excludeSet(target: { category: string; parent?: string }) {
    const level = questionState?.segmentLevel ?? 0;
    const same = (a: string | undefined, b: string) => a !== undefined && normalizeName(a) === normalizeName(b);
    const found = new Map<string, string[]>();
    for (const path of paths) {
      const segments = path.segments;
      if (segments.length === 0) continue;
      const top = Math.min(level, segments.length - 1);
      let cut = -1;
      if (target.parent === undefined) {
        if (same(segmentAt(segments, level), target.category)) cut = top;
        // Een losstaande categorie hangt dieper dan het marktniveau, maar staat
        // als eigen regel. Dan op elke diepte zoeken.
        else {
          for (let depth = top + 1; depth < segments.length; depth++) {
            if (same(segments[depth], target.category)) { cut = depth; break; }
          }
        }
      } else if (same(segments[top], target.parent)) {
        for (let depth = top + 1; depth < segments.length; depth++) {
          if (same(segments[depth], target.category)) { cut = depth; break; }
        }
      }
      if (cut >= 0) {
        const kept = segments.slice(0, cut + 1);
        found.set(pathKey(kept), kept);
      }
    }
    if (found.size === 0) return;
    for (const segments of found.values()) decideCategory(segments, 'excluded');
    const next = [...new Set([...excluded, ...found.keys()])].sort();
    setExcluded(next);
    compose(banks, catalog, latest.current.mapping, latest.current.categories, facets, next);
  }

  /** Een eerder uitgesloten pad weer meenemen. */
  function includePath(key: string) {
    const path = paths.find((candidate) =>
      candidate.segments.some((_, index) => pathKey(candidate.segments.slice(0, index + 1)) === key));
    if (path) {
      const depth = path.segments.findIndex((_, index) => pathKey(path.segments.slice(0, index + 1)) === key);
      decideCategory(path.segments.slice(0, depth + 1), 'category');
    }
    const next = excluded.filter((one) => one !== key);
    setExcluded(next);
    compose(banks, catalog, latest.current.mapping, latest.current.categories, facets, next);
  }

  /** Staat er al een aanvraag? Dan geen formulier meer, alleen de stand. */
  const [queued, setQueued] = useState<'new' | 'joined'>();

  /**
   * De marktsegmenten zoals het categoriescherm ze overhoudt.
   *
   * Van dat scherm gekregen en hier niet opnieuw berekend: het bewijs van de
   * site en de voorstellen van het model leven daar, en zonder die twee blijven
   * "Effen" en "Premium" als marktsegment staan.
   */
  const [segments, setSegments] = useState<{ name: string; count: number }[]>([]);
  /** De paden die hij als kenmerk liet staan; die krijgen geen vragenset. */
  const [facets, setFacets] = useState<string[]>([]);
  /** De paden die hij uitsloot; die en alles eronder doen niet mee. */
  const [excluded, setExcluded] = useState<string[]>([]);
  /**
   * De categoriepaden, één keer per catalogus.
   *
   * Stond eerst als uitdrukking in de render. Dan kreeg het categoriescherm bij
   * elke render een nieuwe lijst, rekende het zijn rijen opnieuw uit, gaf het
   * segmenten en kenmerken omhoog, en renderde deze pagina daardoor weer: een lus
   * die React na vijftig rondes afbrak met "Maximum update depth exceeded".
   */
  const paths = useMemo(
    () => (catalog ? pathsFromProducts(catalog.products, categoryPath) : []),
    [catalog],
  );
  /** De uitgesloten paden met een leesbare naam, om ze terug te kunnen draaien. */
  const excludedLabels = useMemo(() => excluded.map((key) => {
    const path = paths.find((candidate) =>
      candidate.segments.some((_, index) => pathKey(candidate.segments.slice(0, index + 1)) === key));
    const depth = path?.segments.findIndex((_, index) => pathKey(path.segments.slice(0, index + 1)) === key) ?? -1;
    return { key, label: path && depth >= 0 ? path.segments.slice(0, depth + 1).join(' › ') : key };
  }), [excluded, paths]);
  /** Zijn eigen winkel; wordt één van de panelsites, nooit de enige. */
  const [shopUrl, setShopUrl] = useState<string>();
  const [report, setReport] = useState<ScanReport>();
  /**
   * De samenstelling waarop dit rapport rust, zonder het werk van de merchant.
   * Gaat mee als de analyse bewaard wordt, zodat hij later zonder catalogus zijn
   * vragen kan bijstellen.
   */
  const [reportPristine, setReportPristine] = useState<QuestionSetState>();
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
    // Eerst valideren, dan koppelen: wat hier uitgaat, hoeft niet gekoppeld.
    { id: 'questions', label: s.steps.questions },
    { id: 'mapping', label: s.steps.mapping },
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
      if (saved?.mapping) storeMapping(saved.mapping);
      if (saved?.categories) storeCategories(saved.categories);
    });
  }, []);

  /** Stel de sets opnieuw samen; elke bank- of koppelwijziging verandert de vragen. */
  function compose(
    nextBanks: StoredBank[],
    nextCatalog = catalog,
    nextMapping = latest.current.mapping,
    nextCategories = latest.current.categories,
    nextFacets = facets,
    nextExcluded = excluded,
  ) {
    if (!nextCatalog) return;
    const pristine = generateQuestionSets(
      nextCatalog,
      nextBanks.map((entry) => entry.bank),
      nextMapping,
      nextCategories,
      { facets: nextFacets, excluded: nextExcluded },
    );
    // Het werk van de merchant over de verse sets heen. Zonder dit gooide elke
    // wijziging op het koppelscherm uitgezette, aangepaste en eigen vragen en
    // alle bevestigingen weg.
    latest.current.pristine = pristine;
    const applied = applyWork(pristine, latest.current.work);
    setQuestionState(applied.state);
    // Onthouden tot hij opnieuw bevestigt; een volgende samenstelling mag de
    // melding niet stil laten verdwijnen.
    setReconfirm((current) => ({
      categories: [...new Set([...current.categories, ...applied.reconfirm])],
      base: current.base || applied.baseChanged,
    }));
  }

  /**
   * Wat de merchant op het vragensetscherm doet.
   *
   * Meteen als werk vastgelegd en bewaard, zodat het een volgende samenstelling
   * en een volgende sessie overleeft.
   */
  function handleQuestionState(next: QuestionSetState) {
    setQuestionState(next);
    if (latest.current.pristine) latest.current.work = mergeWork(latest.current.work, next, latest.current.pristine);
    setReconfirm((current) => ({
      categories: current.categories.filter((category) =>
        !next.sets.some((set) => setKey(set) === category && set.validated)),
      base: current.base && !next.baseValidated,
    }));
    remember(latest.current.mapping, latest.current.categories);
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
      void settingsStore.save(accountId ?? LOCAL_ACCOUNT, {
        vertical: entry.bank.meta.vertical,
        bankVersion: entry.bank.meta.version,
        mapping: nextMapping,
        categories: nextCategories,
        work: latest.current.work,
      }).then((ok) => setSaveFailed(!ok));
    }
  }

  /**
   * Eerder werk ophalen zodra bekend is welk account en welke markt het is.
   *
   * Eén keer per account, markt en bankversie. Wat de merchant in deze sessie al
   * koos, gaat voor op wat er bewaard stond. De categoriekeuze komt alleen terug
   * als het dezelfde bankversie is: in een nieuwe versie kunnen de vragensets
   * andere id's hebben, en dan laat het scherm de koppeling opnieuw lopen.
   */
  const loadedFor = useRef<string>(undefined);
  useEffect(() => {
    const entry = banks[0];
    if (!entry) return;
    const who = accountId ?? LOCAL_ACCOUNT;
    const key = `${who}:${entry.bank.meta.vertical}:${entry.bank.meta.version}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    let alive = true;
    void (async () => {
      await Promise.resolve();
      const saved = await settingsStore.load(who, entry.bank.meta.vertical);
      if (!alive || !saved) return;
      storeMapping({ ...saved.mapping, ...latest.current.mapping });
      if (saved.bankVersion === entry.bank.meta.version) {
        storeCategories({ ...saved.categories, ...latest.current.categories });
      }
      latest.current.work = saved.work;
      compose(banks);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, banks, settingsStore]);

  /**
   * Een gewijzigde koppeling. Mag een functie zijn, en dat is voor wie laat
   * terugkomt: die werkt dan op de koppeling van nu en niet op die van toen hij
   * begon.
   */
  function handleMapping(update: Mapping | ((current: Mapping) => Mapping)) {
    const next = typeof update === 'function' ? update(latest.current.mapping) : update;
    storeMapping(next);
    compose(banks, catalog, next, latest.current.categories);
    remember(next, latest.current.categories);
  }

  /** Een andere vragenset per categorie verandert wélke vragen er gesteld worden. */
  function handleCategories(
    update: Record<string, string | null> | ((current: Record<string, string | null>) => Record<string, string | null>),
  ) {
    const next = typeof update === 'function' ? update(latest.current.categories) : update;
    storeCategories(next);
    compose(banks, catalog, latest.current.mapping, next);
    remember(latest.current.mapping, next);
  }

  function handleReady(nextClient: ScanClient, nextCatalog: Dataset) {
    setClient(nextClient);
    setCatalog(nextCatalog);

    // Vanuit een bewaarde analyse, op weg naar één vraag. Heeft de merchant over
    // élk categoriepad al beslist, dan zegt het categoriescherm niets nieuws en
    // gaan we meteen door. Anders niet: een pad zonder oordeel valt terug op een
    // gok, en dan zouden de vragensets op een andere indeling rusten dan zijn
    // vorige scan.
    if (fromSaved && focusQuestion && banks.length > 0) {
      const nextPaths = pathsFromProducts(nextCatalog.products, categoryPath);
      const decided = nextPaths.length > 0 && nextPaths.every((path) => verdicts[pathKey(path.segments)] !== undefined);
      if (decided) {
        const rows = applyVerdicts(classifyPaths(nextPaths), verdicts);
        const nextFacets = rows.filter((row) => row.kind === 'facet').map((row) => pathKey(row.segments)).sort();
        const nextExcluded = rows.filter((row) => row.kind === 'excluded').map((row) => pathKey(row.segments)).sort();
        setFacets(nextFacets);
        setExcluded(nextExcluded);
        compose(banks, nextCatalog, latest.current.mapping, latest.current.categories, nextFacets, nextExcluded);
        setStep('questions');
        return;
      }
    }

    compose(banks, nextCatalog);
    setStep('segments');
  }

  async function handleImport(entry: StoredBank) {
    // Een nieuwe lijst brengt eigen categorieën mee, dus de oude keuzes wijzen
    // naar sets die er misschien niet meer zijn. Ze meenemen zou stilzwijgend op
    // "alleen de algemene vragen" uitkomen; leegmaken laat de koppeling opnieuw
    // lopen. De kenmerkkoppeling blijft wél staan: die hangt aan kolomnamen, en
    // die zijn niet veranderd.
    storeCategories({});
    await bankStore.save({ ...entry, mapping: latest.current.mapping, categories: {} });
    const next = await bankStore.list(LOCAL_ACCOUNT);
    setBanks(next);
    compose(next);
  }

  /**
   * De merchant herkent zijn markt in een lijst die er al ligt.
   *
   * Dan is er niets aan te vragen en niets te wachten: de bank hoort bij de
   * markt en niet bij een winkel, dus de tweede merchant in woontextiel meet
   * meteen. Hij komt binnen langs dezelfde weg als een lijst die hij zelf
   * inleest — dezelfde lezer, dezelfde opslag, dezelfde controle.
   */
  async function handleChooseBank(id: string) {
    try {
      const fetched = await fetchReleasedBank(id);
      if (!fetched) return;
      await handleImport({
        accountId: LOCAL_ACCOUNT,
        savedAt: new Date().toISOString(),
        source: fetched.source,
        bankId: id,
        bank: fetched.bank,
      });
      setStep('questions');
    } catch {
      // Mislukt inlezen laat het scherm staan zoals het stond; de merchant kan
      // opnieuw kiezen of alsnog een lijst aanvragen.
    }
  }

  /**
   * Een vrijgegeven bank ophalen en inlezen, met alles wat de beheerder erbij
   * besliste: overgeslagen vragen, losstaande categorieën, gecorrigeerde labels
   * en de bevestigde kenmerktypen. Langs dezelfde lezer als een lijst die de
   * merchant zelf inleest.
   */
  async function fetchReleasedBank(id: string): Promise<{ source: string; bank: StoredBank['bank'] } | undefined> {
    const response = await fetch(`/api/banks?id=${encodeURIComponent(id)}`, { headers: await authHeader() });
    if (!response.ok) return undefined;
    const data = await response.json();
    const read = importQuestionList([{ name: `${data.vertical}.csv`, text: String(data.csv ?? '') }]);
    if (!read.bank) return undefined;
    return {
      source: `${data.vertical} v${data.version}`,
      bank: applyAttributeShapes(
        applyOverlaySettings(
          excludeFromScore(
            applyImportanceCorrections(read.bank, data.importance && typeof data.importance === 'object' ? data.importance : {}),
            Array.isArray(data.excluded) ? data.excluded : [],
          ),
          {
            standalone: Array.isArray(data.standalone) ? data.standalone : [],
            labels: data.labels && typeof data.labels === 'object' ? data.labels : {},
          },
        ),
        data.shapes && typeof data.shapes === 'object' ? data.shapes : {},
      ),
    };
  }

  /**
   * Een gekozen bank verversen zodra bekend is wie er is.
   *
   * Een gekozen bank staat op dit apparaat zoals hij was op het moment van
   * kiezen. Besliste de beheerder daarna iets — een categorie losstaand, een
   * label, een typering — dan kwam dat bij deze merchant nooit aan, en zag hij
   * een oplossing niet die er wel was. Eén keer per sessie en alleen voor dezelfde
   * versie: een nieuwere versie is een andere meetlat, en die kiest hij zelf.
   */
  const refreshedBanks = useRef(false);
  useEffect(() => {
    if (!user || banks.length === 0 || refreshedBanks.current) return;
    refreshedBanks.current = true;
    void (async () => {
      await Promise.resolve();
      let released: { id: string; vertical: string; version: number }[] | undefined;
      const next: StoredBank[] = [];
      let changed = false;
      for (const entry of banks) {
        let id = entry.bankId;
        // Gekozen vóórdat de id bewaard werd: terugvinden op markt en versie.
        const named = /^(.+) v(\d+)$/.exec(entry.source);
        if (!id && named) {
          if (!released) {
            const response = await fetch('/api/banks', { headers: await authHeader() }).catch(() => undefined);
            released = response?.ok ? ((await response.json()).banks ?? []) : [];
          }
          id = released?.find((one) => one.vertical === named[1] && String(one.version) === named[2])?.id;
        }
        const fetched = id ? await fetchReleasedBank(id).catch(() => undefined) : undefined;
        if (!id || !fetched || fetched.source !== entry.source) {
          next.push(entry);
          continue;
        }
        const refreshed: StoredBank = { ...entry, bankId: id, bank: fetched.bank };
        await bankStore.save(refreshed);
        next.push(refreshed);
        changed = true;
      }
      if (!changed) return;
      setBanks(next);
      compose(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, banks]);

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
      const pristineNow = latest.current.pristine;
      setReport(await client.scan(questionState, new Date().toISOString()));
      setReportPristine(pristineNow);
      setStep('report');
    } catch (caught) {
      setScanError((caught as Error).message);
    } finally {
      setScanning(false);
    }
  }

  function restart() {
    setCatalog(undefined);
    setQuestionState(undefined); setReport(undefined); storeMapping({}); storeCategories({}); latest.current.work = undefined; latest.current.pristine = undefined; setExcluded([]); setReconfirm({ categories: [], base: false });
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
                {/* Een stap die al gezet is, is terug te nemen. Alleen die: een
                    stap vooruit heeft nog niet wat hij nodig heeft. Terug gaan
                    gooit niets weg — koppeling, keuzes en het werk op de
                    vragensets blijven staan. */}
                {done ? (
                  <button
                    type="button"
                    onClick={() => { setFocusQuestion(undefined); setStep(entry.id as Step); }}
                    className="text-ok underline-offset-2 hover:underline"
                  >
                    ✓ {entry.label}
                  </button>
                ) : (
                  <span
                    className={current ? 'font-medium text-ink' : 'text-muted'}
                    aria-current={current ? 'step' : undefined}
                  >
                    {entry.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </header>

      <main>
        {fromSaved && focusQuestion && step !== 'questions' && step !== 'report' ? (
          <p className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-sm leading-relaxed text-muted">{s.report.qReviewPending}</p>
        ) : null}
        {step === 'upload' ? <UploadStep s={s} onReady={handleReady} /> : null}

        {step === 'segments' && catalog ? (
          <SegmentStep
            s={s}
            paths={paths}
            verdicts={verdicts}
            onDecide={decideCategory}
            onSegments={setSegments}
            onFacets={setFacets}
            onExcluded={setExcluded}
            onSite={setShopUrl}
            // Pas hier opnieuw samenstellen: nu staat vast welke paden een
            // kenmerk zijn, en daar hangt af welke vragensets er komen.
            onContinue={() => { compose(banks); setStep('bank'); }}
          />
        ) : null}

        {/* Geen uploadscherm meer als eerste beeld. Een webshop-eigenaar weet
            niet welke vragen zijn markt stelt — dat is wat hij komt halen — en
            hem die laten aanleveren is de drempel die niemand neemt. Het inlezen
            staat er nog, als beheerhandeling onder het wachtscherm. */}
        {step === 'bank' && questionState ? (
          <WaitingStep
            s={s}
            status="queued"
            email={user?.email}
            hasList={banks.length > 0}
            request={queued ? undefined : (
              <BankRequestForm
                s={s}
                locale={locale}
                segments={segments}
                accountId={accountId}
                siteUrl={shopUrl}
                onQueued={(joined) => setQueued(joined ? 'joined' : 'new')}
                onChoose={(id) => void handleChooseBank(id)}
              />
            )}
            onContinue={() => setStep('questions')}
          >
            <BankStep
              s={s}
              locale={locale}
              stored={banks}
              onImport={(entry) => void handleImport(entry)}
              onRemove={(vertical) => void handleRemoveBank(vertical)}
              onContinue={() => setStep('questions')}
            />
          </WaitingStep>
        ) : null}

        {/* Eerst welke vragenset bij welke categorie hoort, dan de vragen
            valideren. Die keuze bepaalt wélke vragen er zijn, dus hij staat
            bovenaan en niet een scherm later. */}
        {step === 'questions' && catalog && questionState ? (
          <div className="space-y-4">
            <CategorySetsCard
              s={s}
              locale={locale}
              state={questionState}
              categories={categories}
              onCategories={handleCategories}
              onExclude={excludeSet}
              excluded={excludedLabels}
              onInclude={includePath}
            />
            <QuestionSetStep
              s={s}
              locale={locale}
              catalog={catalog}
              state={questionState}
              onChange={handleQuestionState}
              reconfirm={reconfirm}
              saved={saveFailed ? 'failed' : settingsStore.where}
              focus={focusQuestion}
              onContinue={() => { setFocusQuestion(undefined); setStep('mapping'); }}
            />
          </div>
        ) : null}

        {/* Koppelen na het valideren: alleen kenmerken van vragen die aanstaan. */}
        {step === 'mapping' && catalog && questionState ? (
          <MappingStep
            s={s}
            locale={locale}
            catalog={catalog}
            state={questionState}
            mapping={mapping}
            onChange={handleMapping}
            onRun={() => void handleRun()}
            running={scanning}
            error={scanError}
            onBack={() => setStep('questions')}
          />
        ) : null}

        {step === 'report' && report ? (
          <ReportView
            s={s}
            locale={locale}
            report={report}
            onRestart={restart}
            pristine={reportPristine}
            onReviewQuestion={(question) => { setFocusQuestion(question); setStep('questions'); }}
          />
        ) : null}
      </main>
    </div>
  );
}
