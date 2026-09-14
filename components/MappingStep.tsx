'use client';

// Stap 5: kenmerken aan kolommen koppelen, na het valideren van de vragensets.
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
import type { AttributeShape, Dataset, Locale, QuestionSetState } from '../src/domain/types';
import { attributeInventory, mappingSummary, type Mapping } from '../src/questions/mapping';
import { allValidated, stillToConfirm } from '../src/questions/mutate';
import { describeAttribute, describeColumn } from '../src/semantic/describe';
import { filledIn, profileCatalog, shapeMisfit, type ColumnProfile } from '../src/engine/profile';
import { suggestMappings } from '../src/semantic/suggest';
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
  /**
   * Een functie in plaats van een waarde werkt op de koppeling van nú. Dat is
   * nodig voor alles wat asynchroon terugkomt: een voorstel dat na een minuut
   * landt, hoort niet de keuzes te wissen die de merchant intussen maakte.
   */
  onChange: (mapping: Mapping | ((current: Mapping) => Mapping)) => void;
  /**
   * De scan starten. Dit is de laatste stap vóór het rapport: de vragen zijn op
   * het vorige scherm bevestigd, hier komen de kolommen erbij.
   */
  onRun: () => void;
  /** De scan draait; de knop blijft staan met zijn eigen tekst. */
  running?: boolean;
  /** De scan viel om. Zeggen wat er gebeurde, niet stil blijven. */
  error?: string;
  /** Terug naar het valideren, als daar nog iets open staat. */
  onBack: () => void;
}

/** Geen kolom is een geldig antwoord; die keuze moet expliciet kunnen. */
const NONE = '';

/** Hoeveel voorbeeldwaarden er onder een gekozen kolom staan. Genoeg om te herkennen. */
const SAMPLES_SHOWN = 3;

/**
 * Hoeveel kenmerken er per aanvraag naar de koppelroute gaan.
 *
 * Onder de grens van 200 in de route, en klein genoeg dat het korte antwoord
 * (4.096 tokens) er niet halverwege afbreekt.
 */
const ATTRIBUTE_BATCH = 100;
/** De grens van de koppelroute voor kolommen per aanvraag. */
const MAX_COLUMNS = 300;

/** Hoeveel categorieën de regel onder een kolom hoogstens noemt. */
const CATEGORIES_SHOWN = 3;

export function MappingStep({
  s, locale, catalog, state, mapping, onChange, onRun, running, error, onBack,
}: Props) {
  const ready = allValidated(state);
  const [busy, setBusy] = useState<LoadProgress | 'remote'>();
  const [failed, setFailed] = useState(false);
  /** Welk model de voorstellen deed; dat hoort de merchant te zien. */
  const [source, setSource] = useState<string>();
  /** Wat er aan het antwoord opviel; geen fout, wel iets om na te lopen. */
  const [notes, setNotes] = useState<string[]>([]);
  /** Welke keuzes van het model komen; ze blijven gemarkeerd tot je ze wijzigt. */
  const [proposed, setProposed] = useState<Record<string, string>>({});

  // De keuze van nu telt mee, anders blijft de waarschuwing hieronder staan
  // bij een kenmerk dat de merchant zojuist gekoppeld heeft.
  const rows = useMemo(() => attributeInventory(state, mapping), [state, mapping]);
  const columns = useMemo(
    () => [...catalog.columns].sort((a, b) => a.localeCompare(b)),
    [catalog.columns],
  );

  const summary = useMemo(() => mappingSummary(state, mapping), [state, mapping]);
  /**
   * Wat er in elke kolom staat, over de hele catalogus: vorm, eenheid, hoe vaak
   * gevuld en in welke categorieën. Eén keer per catalogus, in de browser.
   */
  const profiles = useMemo(
    () => profileCatalog(
      catalog,
      state.segmentLevel ?? 0,
      new Set(state.facetPaths ?? []),
      new Set(state.excludedPaths ?? []),
    ),
    [catalog, state.segmentLevel, state.facetPaths, state.excludedPaths],
  );

  const linked = rows.filter((row) => row.fields.length > 0).length;
  const open = rows.filter((row) => row.fields.length === 0);
  const proposals = Object.keys(proposed).length;

  /**
   * Koppel wat er te koppelen valt, zodra het scherm er is.
   *
   * Zonder klik, en dat is de hele bedoeling: een merchant hoort niet te moeten
   * weten dat er een knop bestaat voordat zijn scan klopt. Wie het scherm
   * openslaat en meteen doorklikt kreeg anders een cijfer dat te laag is —
   * tientallen kenmerken ongekoppeld terwijl het antwoord in zijn data staat.
   *
   * De vragenset per categorie ligt op dit moment al vast: die kiest hij op het
   * vragensetscherm, vóór dit scherm. Zo vraagt dit scherm alleen naar kenmerken
   * van vragen die werkelijk gesteld worden.
   */
  const [phase, setPhase] = useState<'attributes' | 'done'>('attributes');
  /**
   * De kenmerken die de merchant zelf aanwees in deze sessie. Een voorstel dat
   * daarna nog binnenkomt, laat die met rust.
   */
  const chosenByMerchant = useRef(new Set<string>());
  /**
   * Een grendel die synchroon dichtgaat. Een fase omzetten kan pas ná het async
   * werk, en zonder grendel begint het effect in de tussenrender opnieuw.
   */
  const startedAttributes = useRef(false);

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
    // Op de koppeling van nu. Een voorstelronde duurt bij een grote bank een
    // minuut; wat de merchant in die tijd zelf koos, blijft staan.
    const chosen = chosenByMerchant.current;
    const marks: Record<string, string> = {};
    for (const pair of pairs) {
      if (pair.columns.length === 0 || chosen.has(pair.key)) continue;
      marks[pair.key] = pair.columns[0];
    }
    setProposed(marks);
    setSource(from);
    onChange((current) => {
      const next = { ...current };
      for (const [key, column] of Object.entries(marks)) next[key] = [column];
      return next;
    });
  }

  /** Een vorm in de woorden van het scherm: "getal (°c)", "ja/nee". */
  const shapeLabel = (shape: AttributeShape | ColumnProfile) =>
    shape.kind === 'number' && shape.unit ? `${s.mapping.kinds.number} (${shape.unit})` : s.mapping.kinds[shape.kind];

  /**
   * Voorstellen die niet kunnen kloppen, zonder model eruit.
   *
   * Een model koppelt op betekenis en ziet een °C-kenmerk en een ja/nee-kolom
   * met dezelfde naam als een match. Die koppeling laat een gat verdwijnen dat er
   * wél is, dus hij vervalt — met een melding, zodat de merchant hem alsnog kan
   * kiezen als hij het beter weet. Alleen voor kenmerken met een bevestigd type.
   */
  function keepFitting(pairs: { key: string; columns: string[] }[]) {
    const shapes = new Map(rows.map((row) => [row.key, row.shape]));
    const kept: { key: string; columns: string[] }[] = [];
    const dropped: string[] = [];
    for (const pair of pairs) {
      const shape = shapes.get(pair.key);
      const column = pair.columns[0];
      const profile = column ? profiles[column] : undefined;
      if (shape && profile && shapeMisfit(shape, profile)) {
        dropped.push(s.mapping.misfitDropped
          .replace('{kenmerk}', pair.key)
          .replace('{kolom}', column)
          .replace('{verwacht}', shapeLabel(shape))
          .replace('{gevonden}', shapeLabel(profile)));
      } else {
        kept.push(pair);
      }
    }
    return { kept, dropped };
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
        shape: row.shape,
        questions: row.questions.map((question) => question[locale]),
      }),
    }));

    // Eerst Claude: die kent de vaktaal en haalt er meer uit. Is er geen sleutel
    // op de server, dan is dat geen storing maar een instelling die ontbreekt,
    // en draait het model in de browser — met dat verschil erbij, want het is
    // een andere kwaliteit en dat hoort niemand te moeten raden.
    setBusy('remote');
    try {
      // In blokken: de route neemt hoogstens 200 kenmerken en 300 kolommen per
      // aanvraag, en een bank als woontextiel v4 vraagt er ruim 700. Eén grote
      // aanvraag gaf een 400 en dus stil geen enkel voorstel. Lege kolommen gaan
      // niet mee: daar valt niets in te herkennen, en ze drukken de kolommen die
      // wél iets zeggen onder de grens.
      const describedColumns = free
        .filter((column) => (profiles[column]?.filled ?? 0) > 0)
        .slice(0, MAX_COLUMNS)
        .map((column) => ({ key: column, text: describeColumn(column, catalog, profiles[column]) }));
      const pairs: { key: string; columns: string[] }[] = [];
      const seenNotes: string[] = [];
      let model = '';
      for (let start = 0; start < described.length; start += ATTRIBUTE_BATCH) {
        // Een kolom die een eerder blok al kreeg, gaat niet opnieuw mee; anders
        // grijpen twee kenmerken naar dezelfde kolom.
        const used = new Set(pairs.flatMap((pair) => pair.columns.slice(0, 1)));
        const result = await requestMapping(
          {
            attributes: described.slice(start, start + ATTRIBUTE_BATCH),
            columns: describedColumns.filter((column) => !used.has(column.key)),
          },
          catalog.columns,
        );
        const fitting = keepFitting(result.pairs);
        pairs.push(...fitting.kept);
        seenNotes.push(...result.notes, ...result.rejected, ...fitting.dropped);
        model = result.model;
        // Wat binnen is, staat er meteen; bij 700 kenmerken hoort niemand een
        // halve minuut naar een lege lijst te kijken.
        setNotes([...seenNotes]);
        accept(pairs, model);
      }
      setBusy(undefined);
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
        [...described.map((entry) => entry.text), ...free.map((column) => (profiles[column]?.sensitive ? column : describeColumn(column, catalog)))],
        setBusy,
      );
      const found = suggestMappings(
        described.map((entry, i) => ({ key: entry.key, vector: vectors[i] })),
        free.map((column, i) => ({ key: column, vector: vectors[described.length + i] })),
      );
      const fitting = keepFitting(found.map((f) => ({ key: f.key, columns: [f.column] })));
      setNotes(fitting.dropped);
      accept(fitting.kept, 'browser');
    } catch (caught) {
      setFailed(caught instanceof ModelUnavailable);
    } finally {
      setBusy(undefined);
    }
  }

  /** Een eigen keuze haalt het voorstel-label weg; het is dan van de merchant. */
  function choose(key: string, column: string) {
    chosenByMerchant.current.add(key);
    setProposed((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    onChange((current) => ({ ...current, [key]: column === NONE ? [] : [column] }));
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
                  <p className="truncate text-xs">
                    <span className="font-mono">{row.key}</span>
                    {/* Wat de bank hier verwacht, zodat een kolom ernaast te
                        leggen is zonder de vragen te lezen. */}
                    {row.shape ? (
                      <span className="ml-2 text-muted">{s.mapping.expects} {shapeLabel(row.shape)}</span>
                    ) : null}
                  </p>
                  {/* De vraag eronder: een sleutel alleen is een woord zonder
                      context, en dan kan niemand beoordelen of de kolom klopt. */}
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {row.questions[0]?.[locale]}
                    {row.questions.length > 1
                      ? ` +${row.questions.length - 1} ${s.mapping.moreQuestions}`
                      : null}
                  </p>
                  {/* Wat er in de gekozen kolom staat. Een kolomnaam zegt niet
                      of hij klopt; "PU-coating, acryl, geen" wel. Dit blijft in
                      de browser. */}
                  {current !== NONE && profiles[current] ? (() => {
                    const profile = profiles[current];
                    if (profile.filled === 0) {
                      return <p className="mt-0.5 text-xs text-muted">{s.mapping.samplesEmpty}</p>;
                    }
                    const where = filledIn(profile);
                    const facts = [
                      profile.kind === 'number' && profile.unit
                        ? `${s.mapping.kinds.number} (${profile.unit})`
                        : s.mapping.kinds[profile.kind],
                      s.mapping.filledShare.replace('{pct}', String(Math.round((profile.filled / profile.total) * 100))),
                      where.length > 0
                        ? s.mapping.filledIn.replace('{categorieen}', where.slice(0, CATEGORIES_SHOWN).join(', '))
                        : null,
                      profile.shared ? s.mapping.sharedField : null,
                    ].filter(Boolean);
                    return (
                      <>
                        <p className="mt-0.5 truncate text-xs text-muted">{facts.join(' · ')}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {s.mapping.samplesIn}{' '}
                          <span className="text-ink">{profile.samples.slice(0, SAMPLES_SHOWN).join(' · ')}</span>
                        </p>
                        {/* Een waarschuwing en geen blokkade: de merchant kent
                            zijn catalogus, en soms draagt een kolom het antwoord
                            in een andere vorm dan de bank verwacht. */}
                        {row.shape && shapeMisfit(row.shape, profile) ? (
                          <p className="mt-0.5 flex items-start gap-1.5 text-xs leading-relaxed text-warn">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                            <span className="min-w-0">
                              {s.mapping.misfit
                                .replace('{verwacht}', shapeLabel(row.shape))
                                .replace('{gevonden}', shapeLabel(profile))}
                            </span>
                          </p>
                        ) : null}
                      </>
                    );
                  })() : null}
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
        {/* Eén telling voor het hele scherm in plaats van een melding per
            kenmerk; welke vragen het zijn staat in het rapport. */}
        {summary.questions > 0 ? (
          <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-3 text-xs leading-relaxed text-warn">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span className="min-w-0">
              {s.mapping.openSummary
                .replace('{vragen}', String(summary.questions))
                .replace('{kenmerken}', String(summary.attributes))}
            </span>
          </p>
        ) : null}
      </Card>

      {/* Staat er toch nog iets open — een nieuwe bankversie, of een bevestiging
          die hij introk — dan zeggen wát en waar, met de weg erheen. Een
          uitgeschakelde knop met "bevestig eerst" liet hem zoeken op een scherm
          waar niets te bevestigen valt. */}
      {!ready ? (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2.5">
          <p className="text-sm font-medium text-warn">{s.mapping.notReadyHeading}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            {s.mapping.notReadyBody}{' '}
            {[
              ...(stillToConfirm(state).base ? [s.questions.baseHeading] : []),
              ...stillToConfirm(state).categories,
            ].join(' · ')}
          </p>
          <div className="mt-2">
            <Button variant="secondary" onClick={onBack}>{s.mapping.backToQuestions}</Button>
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted">{s.mapping.noColumnIsFine}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onRun} disabled={!ready} loading={running}>{s.questions.runScan}</Button>
        {ready ? <span className="text-sm text-muted">{s.questions.allValidated}</span> : null}
        {error ? (
          <div className="mt-3 w-full">
            <ErrorState title={s.errors.scanFailed} body={error} next={s.errors.scanFailedNext} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
