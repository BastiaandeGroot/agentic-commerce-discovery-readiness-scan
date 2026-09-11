'use client';

// Stap 3: kenmerken aan kolommen koppelen.
//
// Je vragenlijst noemt een kenmerk zoals het vak het noemt, je export zoals je
// systeem het opsloeg. Drie lagen, van goedkoop naar duur en elk strenger dan
// nodig: schrijfwijze en taal doet `spec/match.ts` gratis en offline; betekenis
// doet een taalmodel in de browser; en de merchant wijst zelf aan, wat van
// allebei wint.
//
// Wat het model oplevert zijn **voorstellen** en geen koppelingen. Ze staan
// gemarkeerd in de lijst tot de merchant ze laat staan of wijzigt. Dat verschil
// is niet cosmetisch: een model geeft altijd een beste kandidaat, ook als er
// geen goede is, en een verkeerde koppeling laat een gat verdwijnen dat er wél
// is. Ongemarkeerd overnemen zou precies de fout maken die deze scan hoort te
// voorkomen.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import type { Dataset, Locale, QuestionSetState } from '../src/domain/types';
import { attributeInventory, type Mapping } from '../src/questions/mapping';
import { describeAttribute, describeColumn } from '../src/semantic/describe';
import { MIN_MARGIN_CATEGORIES, suggestMappings } from '../src/semantic/suggest';
import { embed, ModelUnavailable, type LoadProgress } from '../src/semantic/model';
import { MappingNotConfigured, requestMapping } from '../src/semantic/remote';
import type { Strings } from '../src/i18n/strings';
import { Badge, Button, Card, CardTitle, ErrorState } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  catalog: Dataset;
  state: QuestionSetState;
  mapping: Mapping;
  onChange: (mapping: Mapping) => void;
  /** Welke vragenset uit de lijst bij welke eigen categorie hoort. */
  categories: Record<string, string | null>;
  onCategories: (next: Record<string, string | null>) => void;
  onContinue: () => void;
}

/** Geen kolom is een geldig antwoord; die keuze moet expliciet kunnen. */
const NONE = '';

export function MappingStep({
  s, locale, catalog, state, mapping, onChange, categories, onCategories, onContinue,
}: Props) {
  const [busy, setBusy] = useState<LoadProgress | 'remote'>();
  const [failed, setFailed] = useState(false);
  /** Welk model de voorstellen deed; dat hoort de merchant te zien. */
  const [source, setSource] = useState<string>();
  /** Wat er aan het antwoord opviel; geen fout, wel iets om na te lopen. */
  const [notes, setNotes] = useState<string[]>([]);
  /** Welke keuzes van het model komen; ze blijven gemarkeerd tot je ze wijzigt. */
  const [proposed, setProposed] = useState<Record<string, string>>({});
  /** Bezig met het koppelen van de vragensets, en wie het deed. */
  const [matchingSets, setMatchingSets] = useState(false);
  const [setsBy, setSetsBy] = useState<string>();

  // De keuze van nu telt mee, anders blijft de waarschuwing hieronder staan
  // bij een kenmerk dat de merchant zojuist gekoppeld heeft.
  const rows = useMemo(() => attributeInventory(state, mapping), [state, mapping]);
  const columns = useMemo(
    () => [...catalog.columns].sort((a, b) => a.localeCompare(b)),
    [catalog.columns],
  );

  const linked = rows.filter((row) => row.fields.length > 0).length;
  const open = rows.filter((row) => row.fields.length === 0);
  const proposals = Object.keys(proposed).length;

  /**
   * Leg de vragensets uit de lijst op de eigen categorieën van de merchant.
   *
   * Dit gebeurt vanzelf en niet pas na een klik, want zonder deze koppeling
   * krijgt élke categorie stilzwijgend alleen de algemene vragen — en dan valt
   * het cijfer te gunstig uit, want juist de categoriespecifieke vragen dragen
   * de onomkeerbare fout. Een merchant hoort niet te moeten weten dat hij eerst
   * een knop moet indrukken voordat zijn eigen lijst helemaal meetelt.
   *
   * Wat de deur uit gaat zijn twee lijstjes namen. Geen aantallen, geen
   * producten: het aantal producten per categorie zegt niets over wélke set
   * erbij hoort, en het is data die er niet hoeft te zijn.
   */
  async function matchCategories(open: typeof state.sets) {
    const namen = state.overlays.map((overlay) => ({ key: overlay.id, text: overlay.label[locale] }));
    const eigen = open.map((set) => ({ key: set.category as string, text: set.category as string }));

    const toepassen = (pairs: { key: string; columns: string[] }[], from: string) => {
      if (pairs.length === 0) return false;
      const next = { ...categories };
      for (const pair of pairs) if (pair.columns[0]) next[pair.columns[0]] = pair.key;
      onCategories(next);
      setSetsBy(from);
      return true;
    };

    try {
      const gevonden = await requestMapping(
        { kind: 'categories', attributes: namen, columns: eigen },
        eigen.map((entry) => entry.key),
      );
      if (toepassen(gevonden.pairs, gevonden.model)) return;
    } catch (caught) {
      if (!(caught instanceof MappingNotConfigured)) return;
    }

    // Terugval op het browsermodel. Dat haalt de categorieën met een verwant
    // woord (Decoratiestoffen ↔ Decorative fabrics) en laat de rest los —
    // gemeten 2 van de 4 goed en 0 fout, dankzij de wederzijds-beste-eis.
    try {
      const vectors = await embed([...namen.map((n) => n.text), ...eigen.map((e) => e.text)]);
      const found = suggestMappings(
        namen.map((n, i) => ({ key: n.key, vector: vectors[i] })),
        eigen.map((e, i) => ({ key: e.key, vector: vectors[namen.length + i] })),
        [],
        { minMargin: MIN_MARGIN_CATEGORIES },
      );
      toepassen(found.map((f) => ({ key: f.key, columns: [f.column] })), 'browser');
    } catch {
      // Geen model beschikbaar: de keuzelijsten staan er, de merchant wijst aan.
    }
  }

  /**
   * Koppel wat er te koppelen valt, zodra het scherm er is.
   *
   * Zonder klik, en dat is de hele bedoeling: een merchant hoort niet te moeten
   * weten dat er een knop bestaat voordat zijn scan klopt. Wie het scherm
   * openslaat en meteen doorklikt kreeg anders een cijfer dat te laag is —
   * tientallen kenmerken ongekoppeld terwijl het antwoord in zijn data staat.
   *
   * In twee fases en niet tegelijk. Dat is een afhankelijkheid en geen
   * voorkeur: een andere vragenset betekent andere kenmerken. Lieten we ze
   * tegelijk lopen, dan schrijven twee stromen allebei hun eigen kijk op de
   * staat terug en wint de laatste — gemeten gedrag, niet theorie: de
   * categoriekoppeling verdween dan zonder spoor.
   */
  const [phase, setPhase] = useState<'sets' | 'attributes' | 'done'>('sets');
  /**
   * Grendels die synchroon dichtgaan, en dat is het hele punt.
   *
   * Een fase omzetten kan pas ná het async werk, en intussen levert elke
   * toepassing een nieuwe staat en dus een nieuwe render op. Zonder deze
   * grendel ziet het effect dan nog steeds de oude fase en begint het opnieuw:
   * gemeten negen modelaanroepen waar er twee horen te zijn.
   */
  const startedSets = useRef(false);
  const startedAttributes = useRef(false);

  useEffect(() => {
    if (phase !== 'sets' || startedSets.current) return;
    startedSets.current = true;
    const openSets = state.sets.filter(
      (set) => set.category !== undefined && set.overlayId === undefined,
    );
    void (async () => {
      // De render eerst laten aflopen; een fase omzetten in het lichaam van een
      // effect lokt een extra render uit voordat deze klaar is.
      await Promise.resolve();
      if (openSets.length > 0 && state.overlays.length > 0) {
        setMatchingSets(true);
        try {
          await matchCategories(openSets);
        } finally {
          setMatchingSets(false);
        }
      }
      // Pas hierna: de volgende render draagt de nieuw samengestelde sets, en
      // dus de kenmerken die er werkelijk gevraagd worden.
      setPhase('attributes');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state.sets, state.overlays]);

  useEffect(() => {
    if (phase !== 'attributes' || startedAttributes.current) return;
    startedAttributes.current = true;
    void (async () => {
      await Promise.resolve();
      setPhase('done');
      if (open.length > 0) await suggest();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /**
   * Wat de knop zegt terwijl hij bezig is.
   *
   * Met percentage zodra dat bekend is: het browsermodel is 113 MB, en een knop
   * die een minuut lang hetzelfde zegt leest als vastgelopen. Die download
   * gebeurt één keer; daarna staat hij in de cache van de browser en is het
   * rekenwerk twee seconden.
   */
  function label(state: LoadProgress | 'remote'): string {
    if (state === 'remote') return s.mapping.suggestBusy.remote;
    const text = s.mapping.suggestBusy[state.step];
    return state.ratio === undefined ? text : `${text} ${Math.round(state.ratio * 100)}%`;
  }

  /** Neem voorstellen over en markeer ze, zodat ze na te lopen blijven. */
  function accept(pairs: { key: string; columns: string[] }[], from: string) {
    const next = { ...mapping };
    const marks: Record<string, string> = {};
    for (const pair of pairs) {
      if (pair.columns.length === 0) continue;
      next[pair.key] = [pair.columns[0]];
      marks[pair.key] = pair.columns[0];
    }
    setProposed(marks);
    setSource(from);
    onChange(next);
  }

  async function suggest() {
    setFailed(false);
    // Alleen wat nog open staat, en alleen de kolommen die nog vrij zijn: wat al
    // gekoppeld is hoeft niet opnieuw en mag niet weggekaapt worden.
    const taken = rows.flatMap((row) => mapping[row.key] ?? []);
    const free = columns.filter((column) => !taken.includes(column));
    const described = open.map((row) => ({
      key: row.key,
      text: describeAttribute({
        key: row.key,
        questions: row.questions.map((question) => question[locale]),
      }),
    }));

    // Eerst Claude: die kent de vaktaal en haalt er meer uit. Is er geen sleutel
    // op de server, dan is dat geen storing maar een instelling die ontbreekt,
    // en draait het model in de browser — met dat verschil erbij, want het is
    // een andere kwaliteit en dat hoort niemand te moeten raden.
    setBusy('remote');
    try {
      const result = await requestMapping(
        { attributes: described, columns: free.map((column) => ({ key: column, text: describeColumn(column, catalog) })) },
        catalog.columns,
      );
      setNotes([...result.notes, ...result.rejected]);
      accept(result.pairs, result.model);
      return;
    } catch (caught) {
      if (!(caught instanceof MappingNotConfigured)) {
        setFailed(true);
        setBusy(undefined);
        return;
      }
    }

    setBusy({ step: 'library' });
    try {
      const vectors = await embed(
        [...described.map((entry) => entry.text), ...free.map((column) => describeColumn(column, catalog))],
        setBusy,
      );
      const found = suggestMappings(
        described.map((entry, i) => ({ key: entry.key, vector: vectors[i] })),
        free.map((column, i) => ({ key: column, vector: vectors[described.length + i] })),
      );
      setNotes([]);
      accept(found.map((f) => ({ key: f.key, columns: [f.column] })), 'browser');
    } catch (caught) {
      setFailed(caught instanceof ModelUnavailable);
    } finally {
      setBusy(undefined);
    }
  }

  /** Een eigen keuze haalt het voorstel-label weg; het is dan van de merchant. */
  function choose(key: string, column: string) {
    setProposed((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    onChange({ ...mapping, [key]: column === NONE ? [] : [column] });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.mapping.intro}>{s.mapping.heading}</CardTitle>
        <p className="text-sm">
          <span className="tnum font-semibold">{linked}</span>
          <span className="text-muted"> / </span>
          <span className="tnum font-semibold">{rows.length}</span>{' '}
          <span className="text-muted">{s.mapping.countLinked}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{s.mapping.agentNote}</p>

        {/* Bezig, of opnieuw kunnen proberen. Geen knop om het te stárten: dat
            gebeurt vanzelf zodra dit scherm er is. Wél een knop om het over te
            doen — een mislukte download of een korte storing mag geen reden zijn
            om de rest met de hand te moeten koppelen. */}
        {busy ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Sparkles className="size-4 animate-pulse" aria-hidden />
            {label(busy)}
          </p>
        ) : open.length > 0 && phase === 'done' ? (
          <div className="mt-3">
            <Button variant="secondary" onClick={() => void suggest()}>
              <Sparkles className="size-4" aria-hidden />
              {s.mapping.suggestAgain}
            </Button>
          </div>
        ) : null}

        <p className="mt-2 text-xs leading-relaxed text-muted">{s.mapping.suggestNote}</p>

        {failed ? (
          <div className="mt-3">
            <ErrorState
              title={s.mapping.suggestFailed}
              body={s.mapping.suggestFailedBody}
              next={s.mapping.suggestFailedNext}
            />
          </div>
        ) : null}

        {notes.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 rounded-lg border border-warn/40 bg-warn-soft px-4 py-2.5 pl-7 text-xs leading-relaxed text-ink">
            {notes.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        ) : null}

        {proposals > 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-ink">
            <span className="tnum font-semibold">{proposals}</span> {s.mapping.proposedCount}{' '}
            {source === 'browser' ? s.mapping.bySelf : `${s.mapping.byModel} ${source}.`}
          </p>
        ) : null}
      </Card>

      {/* Eerst welke vragenset bij welke categorie hoort, en pas daarna de
          kenmerken. Die volgorde is niet willekeurig: kiest de merchant hier een
          andere set, dan verandert de lijst kenmerken eronder mee — een
          gordijnenset vraagt naar lichtdoorlatendheid, een meubelset naar
          slijtvastheid. */}
      {state.overlays.length > 0 ? (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {s.mapping.setsHeading}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{s.mapping.setsNote}</p>
          {state.sets.some((set) => set.parent) ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.mapping.setSubNote}</p>
          ) : null}
          {matchingSets ? (
            <p className="mt-1.5 text-xs text-muted">{s.mapping.setsMatching}</p>
          ) : setsBy ? (
            <p className="mt-1.5 text-xs text-muted">
              {s.mapping.setsMatched}{' '}
              <span className="text-ink">
                {setsBy === 'browser' ? s.mapping.bySelf : `${s.mapping.byModel} ${setsBy}.`}
              </span>
            </p>
          ) : null}
          <ul className="mt-2">
            {state.sets.filter((set) => set.category !== undefined).map((set) => (
              <li
                key={set.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0"
              >
                <span className={`min-w-0 flex-1 truncate text-sm ${set.parent ? 'pl-4' : ''}`}>
                  {set.category}
                  {/* Een subcategorie noemt haar tak: "Lampenkapstoffen" zegt
                      zonder "onder Decoratiestoffen" niet waar ze in de boom zit. */}
                  {set.parent ? (
                    <span className="ml-1.5 text-xs text-muted">{s.mapping.setUnder} {set.parent}</span>
                  ) : null}
                  <span className="ml-2 text-xs text-muted">
                    {set.questions.filter((q) => q.layer === 'category').length > 0
                      ? `${set.questions.length} ${s.mapping.setQuestions}`
                      : s.mapping.setBaseOnly}
                  </span>
                </span>
                <select
                  aria-label={set.category}
                  value={categories[set.category as string] ?? set.overlayId ?? ''}
                  onChange={(event) => onCategories({
                    ...categories,
                    [set.category as string]: event.target.value === '' ? null : event.target.value,
                  })}
                  className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink"
                >
                  <option value="">{s.mapping.setNone}</option>
                  {state.overlays.map((overlay) => (
                    <option key={overlay.id} value={overlay.id}>{overlay.label[locale]}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {s.mapping.listHeading}
        </p>
        <ul className="mt-2">
          {rows.map((row) => {
            const current = mapping[row.key]?.[0] ?? row.fields[0] ?? NONE;
            const isProposal = proposed[row.key] !== undefined;
            return (
              <li
                key={row.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{row.key}</p>
                  {/* De vraag eronder: een sleutel alleen is een woord zonder
                      context, en dan kan niemand beoordelen of de kolom klopt. */}
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {row.questions[0]?.[locale]}
                    {row.questions.length > 1
                      ? ` +${row.questions.length - 1} ${s.mapping.moreQuestions}`
                      : null}
                  </p>
                  {/* Een som heeft al zijn termen. Koppel je de rolbreedte en
                      niet de rapporthoogte, dan blijft "hoeveel meter heb ik
                      nodig" onbeantwoordbaar — en dít is het moment waarop de
                      merchant er nog iets aan kan doen. */}
                  {row.blocked.map((entry) => (
                    <p
                      key={entry.question.nl}
                      className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-warn"
                    >
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="text-ink">{entry.question[locale]}</span>{' '}
                        {s.mapping.alsoNeeds}{' '}
                        {entry.missing.map((one) => one.label[locale]).join(', ')}
                      </span>
                    </p>
                  ))}
                </div>
                {isProposal ? <Badge tone="accent">{s.mapping.proposed}</Badge> : null}
                <select
                  aria-label={row.key}
                  value={current}
                  onChange={(event) => choose(row.key, event.target.value)}
                  className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink"
                >
                  <option value={NONE}>{s.mapping.noColumn}</option>
                  {columns.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </Card>

      <Button onClick={onContinue}>{s.mapping.continue}</Button>
    </div>
  );
}
