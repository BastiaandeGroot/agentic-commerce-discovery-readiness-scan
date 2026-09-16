'use client';

// Stap 2: de vragensets valideren.
//
// Dit scherm is geen formaliteit. De sets zijn gegenereerd uit de categorieen en
// kolommen van de merchant, maar het blijven hypotheses; zonder validatielus is
// de eerste aanwijzing dat een set fout was een klacht (S6). Elke wijziging komt
// in de changelog en verhoogt de versie, want zonder dat is vergelijken over tijd
// betekenisloos (S8).

import { useEffect, useMemo, useState } from 'react';
import type { Dataset, Locale, Question, QuestionSetState } from '../src/domain/types';
import { isScored } from '../src/questions/compose';
import { FIELDS, requirementLabel } from '../src/spec/fields';
import {
  addQuestion, allValidated, baseQuestions, byCoverage, disableUncovered, disableUncoveredBase,
  enableUncovered, enableUncoveredBase,
  editBaseQuestion, editQuestion, hasOwnQuestions, isUncovered, stillToConfirm,
  toggleBaseQuestion, toggleBaseValidated, toggleQuestion, toggleValidated,
} from '../src/questions/mutate';
import type { Strings } from '../src/i18n/strings';
import { Badge, Button, Card, CardTitle } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  /**
   * Zonder catalogus — een bewaarde analyse bijwerken — kan er geen vraag bij:
   * een nieuwe vraag is nog nergens gemeten, en de kolommen om hem op te leggen
   * zijn er niet.
   */
  catalog?: Dataset;
  state: QuestionSetState;
  onChange: (next: QuestionSetState) => void;
  /**
   * Door naar het koppelen. Valideren komt eerst: een vraag die hier uitgaat of
   * een categorie die hier geen eigen vragen houdt, vraagt straks geen koppeling.
   */
  onContinue: () => void;
  /** Wat opnieuw bevestigd moet worden omdat de bank het veranderde. */
  reconfirm?: { categories: string[]; base: boolean };
  /** Waar het werk bewaard wordt, of dat bewaren mislukte. */
  saved?: 'account' | 'browser' | 'failed';
  /**
   * Vanuit het rapport: open de kaart van deze vraag en scrol ernaartoe. Een
   * algemene vraag staat één keer, in de kaart met de algemene vragen.
   */
  focus?: { setId: string; questionId: string; base: boolean };
  /** Wat de knop onderaan zegt; standaard door naar het koppelen. */
  continueLabel?: string;
  /** Pas door als alles bevestigd is. Uit bij een bewaarde analyse: daar is terug altijd goed. */
  requireValidated?: boolean;
}

/** Het anker van een vraag op dit scherm; het rapport springt ernaartoe. */
function anchorOf(setId: string, questionId: string, base: boolean): string {
  return base ? `vraag-algemeen-${questionId}` : `vraag-${setId}-${questionId}`;
}



/**
 * Het gewicht van een vraag, in woord en in vorm.
 *
 * Kritiek krijgt de danger-toon en niet omdat er iets mis is: het is de vraag
 * die de fout voorkomt die de koper niet kan terugdraaien, en die moet uit de
 * rij springen. Er staat altijd een woord in de badge, want kleur mag de
 * betekenis nooit alleen dragen.
 */
const IMPORTANCE_TONE = {
  critical: 'danger', high: 'warn', medium: 'neutral', low: 'neutral',
} as const;

function QuestionRow({
  s, locale, setId, question, onChange, state, shared, note, focused,
}: {
  s: Strings; locale: Locale; setId: string; question: Question;
  state: QuestionSetState; onChange: (n: QuestionSetState) => void;
  /**
   * Een algemene vraag: bewerken en uitzetten werken dan op élke categorie.
   * Anders meten twee categorieën verschillende dingen onder hetzelfde id.
   */
  shared?: boolean;
  /** Waar deze vraag anders weegt; alleen bij de algemene vragen. */
  note?: string;
  /** De vraag waar het rapport naartoe verwees. */
  focused?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.label[locale]);
  const [why, setWhy] = useState(false);
  const importance = question.importance ?? 'medium';
  const scored = isScored(question);

  function save() {
    const label = { ...question.label, [locale]: draft } as { nl: string; en: string };
    const at = new Date().toISOString();
    onChange(shared
      ? editBaseQuestion(state, at, question.id, label)
      : editQuestion(state, at, setId, question.id, label));
    setEditing(false);
  }

  return (
    <li
      id={anchorOf(setId, question.id, shared === true)}
      className={`flex scroll-mt-24 flex-wrap items-start gap-3 border-t border-line py-2.5 ${question.disabled ? 'opacity-45' : ''} ${focused ? '-mx-2 rounded-md bg-surface-2 px-2' : ''}`}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm"
              autoFocus
            />
            <Button onClick={save}>{s.questions.save}</Button>
            <Button variant="quiet" onClick={() => { setDraft(question.label[locale]); setEditing(false); }}>
              {s.questions.cancel}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm">
              {/* De laag vóór de vraag: algemeen geldt voor élk product,
                  categorie-eigen gaat over wat in déze categorie misgaat. Zonder
                  dat verschil leest een set als één hoop en kan niemand zien of
                  de categoriespecifieke vragen überhaupt zijn aangekomen. */}
              {/* Een label en geen status: de vorm van de badge onderscheidt,
                  de kleur oordeelt niet. */}
              {question.layer === 'category' ? (
                <span className="mr-2 align-middle">
                  <Badge tone="neutral">{s.questions.layerCategory}</Badge>
                </span>
              ) : null}
              {question.label[locale]}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {/* Het bewijs per attribuut, niet als één platte lijst velden: een
                  vraag die twee dingen tegelijk vraagt is iets anders dan een
                  vraag die tevreden is met één van de twee. */}
              {s.questions.needs}:{' '}
              {question.evidence && question.evidence.length > 0
                ? question.evidence
                  .map((group) => group.label[locale])
                  .join(' + ')
                : question.requires.map((r) => requirementLabel(r, locale)).join(' · ')}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
              {question.intent ? <span>{s.questions.intents[question.intent]}</span> : null}
              <span>
                {s.questions.coverage}:{' '}
                {question.coverage === null || question.coverage === undefined
                  ? s.questions.coverageNone
                  : <span className="tnum">{question.coverage}</span>}
              </span>
              {question.weightNote ? (
                <button
                  type="button"
                  onClick={() => setWhy(!why)}
                  aria-expanded={why}
                  className="underline decoration-dotted underline-offset-2 hover:text-ink"
                >
                  {s.questions.weightNote}
                </button>
              ) : null}
            </div>
            {why && question.weightNote ? (
              <p className="mt-1.5 rounded-md bg-surface-2 p-2 text-xs leading-relaxed text-muted">
                {question.weightNote[locale]}
              </p>
            ) : null}
            {/* Begrenst het antwoord in plaats van het gewicht te verantwoorden:
                "alleen bij een leveranciersverklaring, nooit afleiden" gaat over
                wat je met een gevuld veld wél en niet mag beweren. Staat er open
                en niet achter een knop, want een claim die te ver gaat is niet
                terug te nemen. */}
            {question.caution ? (
              <p className="mt-1.5 rounded-md bg-surface-2 p-2 text-xs leading-relaxed text-muted">
                <span className="font-medium text-ink">{s.questions.caution}:</span>{' '}
                {question.caution[locale]}
              </p>
            ) : null}
            {!scored ? (
              <p className="mt-1.5 rounded-md bg-surface-2 p-2 text-xs leading-relaxed text-muted">
                {s.questions.notScoredExplain}
              </p>
            ) : null}
            {/* Dezelfde vraag, elders zwaarder. Dat is geen tweede vraag maar
                een aantekening bij deze; apart tonen zou de lijst verdubbelen. */}
            {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}

            {/* Op hoeveel webshops in zijn markt dit onderwerp voorkwam. Subtiel,
                want het is geen oordeel over hem — maar het zegt wel iets: hoe
                meer winkels het behandelen, hoe zekerder dat zijn koper ernaar
                vraagt. Nul is geen leegte maar een vondst. */}
            {question.coverage !== undefined && question.coverage !== null ? (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {question.coverage === 0 ? s.questions.coverageZero : (
                  <>
                    {s.questions.coverageOn} <span className="font-medium text-ink">{question.coverage}</span>{' '}
                    {s.questions.coverageOf}. {s.questions.coverageWhy}
                  </>
                )}
              </p>
            ) : null}

            {/* Een grenswaarde zonder bron: dat hoort hij te weten, want hij meet
                er anders op zonder te zien waar het getal vandaan komt. Met wat
                hij eraan kan doen erbij — een melding zonder uitweg is een
                mededeling. */}
            {question.ruleSourced === false ? (
              <p className="mt-1 text-xs leading-relaxed text-warn">
                {s.questions.ruleUnsourced}{' '}
                <span className="text-muted">{s.questions.ruleUnsourcedWhat}</span>
              </p>
            ) : null}
          </>
        )}
      </div>

      {!editing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {scored ? (
            <Badge tone={IMPORTANCE_TONE[importance]}>{s.questions.importance[importance]}</Badge>
          ) : (
            <Badge tone="neutral">{s.questions.notScored}</Badge>
          )}
          {/* Herkomst is een label en geen handeling; het woord doet het werk. */}
          <Badge tone="neutral">
            {question.origin === 'custom' ? s.questions.fromData : s.questions.fromArchetype}
          </Badge>
          <Button variant="quiet" onClick={() => setEditing(true)}>{s.questions.edit}</Button>
          <Button
            variant="quiet"
            onClick={() => {
              const at = new Date().toISOString();
              onChange(shared
                ? toggleBaseQuestion(state, at, question.id)
                : toggleQuestion(state, at, setId, question.id));
            }}
          >
            {question.disabled ? s.questions.enable : s.questions.disable}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** Anker een eigen kolom als eis, zodat alleen die kolom hem beantwoordt. */
function columnPattern(column: string): string {
  return `attr:^${column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

/** Sleutel voor de kaart met de algemene vragen; geen set-id, dus botst niet. */
const BASE = '\u0000base';

export function QuestionSetStep({
  s, locale, catalog, state, onChange, onContinue, reconfirm, saved, focus, continueLabel, requireValidated = true,
}: Props) {
  const [openSet, setOpenSet] = useState<string | undefined>(focus ? (focus.base ? BASE : focus.setId) : BASE);

  // Naar de vraag waar het rapport vandaan kwam. Eén keer, bij binnenkomst: wie
  // daarna verder scrolt of een andere kaart opent, wordt niet teruggetrokken.
  useEffect(() => {
    if (!focus) return;
    document.getElementById(anchorOf(focus.setId, focus.questionId, focus.base))
      ?.scrollIntoView({ block: 'center' });
  }, [focus]);
  const [newLabel, setNewLabel] = useState('');
  const [newField, setNewField] = useState('');

  // Keuzelijst: de canonieke velden plus de eigen kolommen die we niet plaatsten.
  const fieldOptions = useMemo(() => {
    const canonical = FIELDS.map((f) => ({ value: f.key, label: f.label[locale] }));
    const own = (catalog?.unmappedColumns ?? []).map((c) => ({ value: columnPattern(c), label: c }));
    return [...canonical, ...own];
  }, [catalog?.unmappedColumns, locale]);

  // Op dekking, hoog naar laag: wat de meeste webshops in de markt behandelen
  // staat bovenaan bij het nalopen.
  const base = useMemo(() => byCoverage(baseQuestions(state), (entry) => entry.question.coverage), [state]);
  const baseUncovered = base.filter((entry) => isUncovered(entry.question) && !entry.question.disabled).length;
  const baseUncoveredOff = base.filter((entry) => isUncovered(entry.question) && entry.question.disabled).length;
  const ready = !requireValidated || allValidated(state);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.questions.intro}>{s.questions.heading}</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="neutral">
            {state.sets.length} {s.questions.categoriesFound}
          </Badge>
          <Badge>{s.questions.version} {state.version}</Badge>
          <span className="text-muted">{s.questions.generatedNote}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{s.questions.importanceExplain}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{s.questions.sortedByCoverage}</p>

        {/* Waar dit werk blijft. Een merchant die een uur nakijkt, hoort te weten
            of hij het morgen nog heeft. */}
        {saved ? (
          <p className={`mt-1 text-xs leading-relaxed ${saved === 'failed' ? 'text-warn' : 'text-muted'}`}>
            {saved === 'account' ? s.questions.savedAccount
              : saved === 'browser' ? s.questions.savedBrowser
              : s.questions.saveFailed}
          </p>
        ) : null}

        {/* De bank veranderde onder een bevestiging. Die bevestiging stil laten
            staan is een oordeel over vragen die hij niet zag. */}
        {reconfirm && (reconfirm.categories.length > 0 || reconfirm.base) ? (
          <div className="mt-3 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2.5">
            <p className="text-sm font-medium text-warn">{s.questions.reconfirmHeading}</p>
            {reconfirm.categories.length > 0 ? (
              <>
                <p className="mt-1 text-xs leading-relaxed text-ink">{s.questions.reconfirmBody}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">{reconfirm.categories.join(' · ')}</p>
              </>
            ) : null}
            {reconfirm.base ? (
              <p className="mt-1 text-xs leading-relaxed text-ink">{s.questions.reconfirmBase}</p>
            ) : null}
          </div>
        ) : null}

        {/* De categorienamen van de lijst sloten niet aan op de boom van de
            merchant, dus draagt elke set alleen de basislaag. Dat halveert de
            meting stilletjes — de categoriespecifieke vragen zijn juist waar de
            onomkeerbare fout in zit — en dat hoort niemand af te leiden uit een
            lager cijfer. */}
        {state.categoriesWithoutOverlay.length > 0 ? (
          <div className="mt-3 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2.5">
            <p className="text-sm font-medium text-warn">{s.questions.noOverlayHeading}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink">{s.questions.noOverlayBody}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink">
              {state.categoriesWithoutOverlay.join(' · ')}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink">{s.questions.noOverlayNext}</p>
          </div>
        ) : null}

        {/* Wat de app zelf koppelde. Een gok van ons, dus controleerbaar: een
            verkeerd gekoppelde kolom laat een gat verdwijnen dat er wel is. */}
        {state.attributeMatches.length > 0 ? (
          <div className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {s.questions.matchedHeading}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.questions.matchedBody}</p>
            <ul className="mt-1.5 space-y-0.5 text-xs">
              {state.attributeMatches.map((match) => (
                <li key={match.key} className="flex flex-wrap items-baseline gap-1.5">
                  <span className="font-mono text-muted">{match.key}</span>
                  <span aria-hidden className="text-muted">→</span>
                  <span className="font-mono">{match.columns.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* De algemene vragen, één keer. Ze staan in élke categorie onder hetzelfde
          id en met dezelfde tekst — een overlay mag herwegen maar niet
          herschrijven — dus ze vier keer voorleggen vraagt vier keer hetzelfde
          oordeel. Wie dat moet doen leest de vierde keer niet meer. */}
      {base.length > 0 ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpenSet(openSet === BASE ? undefined : BASE)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="text-muted">{openSet === BASE ? '▾' : '▸'}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.questions.baseHeading}</span>
                <span className="text-xs text-muted">
                  <span className="tnum">{base.length}</span> {s.questions.baseCount}
                </span>
              </span>
            </button>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {baseUncovered > 0 ? (
                <Button
                  variant="quiet"
                  onClick={() => onChange(disableUncoveredBase(state, new Date().toISOString()))}
                >
                  {s.questions.disableUncovered} · {s.questions.disableUncoveredCount.replace('{aantal}', String(baseUncovered))}
                </Button>
              ) : null}
              {/* Terug te draaien in één keer, zoals het uitzetten ging. */}
              {baseUncoveredOff > 0 ? (
                <Button
                  variant="quiet"
                  onClick={() => onChange(enableUncoveredBase(state, new Date().toISOString()))}
                >
                  {s.questions.enableUncovered} · {s.questions.enableUncoveredCount.replace('{aantal}', String(baseUncoveredOff))}
                </Button>
              ) : null}
              {state.baseValidated ? <Badge tone="ok">✓ {s.questions.validated}</Badge> : null}
              <Button
                variant={state.baseValidated ? 'quiet' : 'secondary'}
                onClick={() => onChange(toggleBaseValidated(state))}
              >
                {state.baseValidated ? s.questions.unvalidate : s.questions.baseValidate}
              </Button>
            </div>
          </div>
          {openSet === BASE ? (
            <>
            {baseUncovered > 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-muted">{s.questions.disableUncoveredNote}</p>
            ) : null}
            <ul className="mt-3">
              {base.map(({ question, reweighted }) => (
                <QuestionRow
                  key={question.id}
                  s={s} locale={locale} setId={state.sets[0]?.id ?? ''} question={question}
                  state={state} onChange={onChange} shared
                  focused={focus?.base === true && focus.questionId === question.id}
                  note={reweighted.length > 0
                    ? `${s.questions.reweighted}: ${reweighted
                      .map((r) => `${r.category} — ${s.questions.importance[r.importance]}`)
                      .join(' · ')}`
                    : undefined}
                />
              ))}
            </ul>
            </>
          ) : null}
        </Card>
      ) : null}

      {state.sets.map((set) => {
        const open = openSet === set.id;
        const own = set.questions.filter((q) => q.layer === 'category');
        const active = own.filter((q) => !q.disabled).length;
        const uncovered = own.filter((q) => isUncovered(q) && !q.disabled).length;
        const uncoveredOff = own.filter((q) => isUncovered(q) && q.disabled).length;
        return (
          <Card key={set.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpenSet(open ? undefined : set.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="text-muted">{open ? '▾' : '▸'}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{set.label[locale]}</span>
                  <span className="text-xs text-muted">
                    <span className="tnum">{set.productCount ?? 0}</span> {s.questions.productsInCategory} ·{' '}
                    {own.length > 0
                      ? <><span className="tnum">{active}</span> {s.questions.ownCount}</>
                      : s.questions.noOwn}
                  </span>
                </span>
              </button>
              {/* Terugdraaibaar: wie halverwege bedenkt dat een set toch niet
                  klopt, moet dat kunnen terugnemen zonder opnieuw te beginnen. */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* Een voorlopige bank hoort de merchant te zien, niet te raden:
                    zijn cijfer klopt met de gestelde vragen, maar of dít de
                    vragen zijn is beredeneerd en niet onderzocht.
                    "In review" valt weg zodra de merchant de set bevestigde:
                    dan heeft hij hem nagelopen, en naast "Bevestigd" leest het
                    als een tegenspraak. Een voorlopige bank blijft staan — die
                    zegt iets over de bank, niet over zijn oordeel. */}
                {set.bankStatus && set.bankStatus !== 'frozen'
                  && !(set.bankStatus === 'in-review'
                    && (hasOwnQuestions(set) ? set.validated : state.baseValidated)) ? (
                  <Badge tone="warn">{s.bank.status[set.bankStatus]}</Badge>
                ) : null}
                {/* Alleen de eigen vragen van deze categorie; de algemene vragen
                    hebben hun eigen knop, want die gelden overal tegelijk. */}
                {uncovered > 0 ? (
                  <Button
                    variant="quiet"
                    onClick={() => onChange(disableUncovered(state, new Date().toISOString(), set.id))}
                  >
                    {s.questions.disableUncovered} · {s.questions.disableUncoveredCount.replace('{aantal}', String(uncovered))}
                  </Button>
                ) : null}
                {uncoveredOff > 0 ? (
                  <Button
                    variant="quiet"
                    onClick={() => onChange(enableUncovered(state, new Date().toISOString(), set.id))}
                  >
                    {s.questions.enableUncovered} · {s.questions.enableUncoveredCount.replace('{aantal}', String(uncoveredOff))}
                  </Button>
                ) : null}
                {hasOwnQuestions(set) ? (
                  <>
                    {set.validated ? <Badge tone="ok">✓ {s.questions.validated}</Badge> : null}
                    <Button
                      variant={set.validated ? 'quiet' : 'secondary'}
                      onClick={() => onChange(toggleValidated(state, set.id))}
                    >
                      {set.validated ? s.questions.unvalidate : s.questions.validate}
                    </Button>
                  </>
                ) : (
                  // Geen eigen vragen: deze categorie is helemaal de basislaag, en
                  // is bevestigd zodra de algemene vragen dat zijn. Zonder deze
                  // status leek hij nog open te staan.
                  state.baseValidated
                    ? <Badge tone="ok">✓ {s.questions.validatedViaBase}</Badge>
                    : <Badge tone="neutral">{s.questions.waitsForBase}</Badge>
                )}
              </div>
            </div>

            {open ? (
              <>
                {own.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">{s.questions.noOwnExplain}</p>
                ) : (
                  <ul className="mt-3">
                    {byCoverage(own, (question) => question.coverage).map((question) => (
                      <QuestionRow
                        key={question.id}
                        s={s} locale={locale} setId={set.id} question={question}
                        state={state} onChange={onChange}
                        focused={focus?.base === false && focus.setId === set.id && focus.questionId === question.id}
                      />
                    ))}
                  </ul>
                )}

                {catalog ? (
                <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg bg-surface-2 p-3">
                  <label className="min-w-0 flex-1 text-xs text-muted">
                    {s.questions.newQuestionLabel}
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
                    />
                  </label>
                  <label className="min-w-0 flex-1 text-xs text-muted">
                    {s.questions.newQuestionField}
                    <select
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
                    >
                      <option value="">—</option>
                      {fieldOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <Button
                    disabled={newLabel.trim() === '' || newField === ''}
                    onClick={() => {
                      onChange(addQuestion(state, new Date().toISOString(), set.id, { nl: newLabel, en: newLabel }, [newField]));
                      setNewLabel(''); setNewField('');
                    }}
                  >
                    {s.questions.add}
                  </Button>
                </div>
                ) : null}
              </>
            ) : null}
          </Card>
        );
      })}

      {/* Het wijzigingslog staat in het dashboard, bij de andere dingen die je
          terugleest. Hier zou het de lijst onderaan alleen maar langer maken. */}
      <p className="text-xs leading-relaxed text-muted">{s.questions.changeLogMoved}</p>


      {/* Op slot tot alles bevestigd is, en dan zeggen wát nog open staat. Eerst
          ging dit verder zonder bevestiging, en stond de merchant op het
          koppelscherm voor een scanknop die niet werkte en een bevestigknop die
          een scherm terug stond. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onContinue} disabled={!ready}>{continueLabel ?? s.questions.continueToMapping}</Button>
        {ready && requireValidated ? (
          <span className="text-sm text-muted">{s.questions.continueNote}</span>
        ) : null}
      </div>
      {!ready ? (
        <p className="text-sm leading-relaxed text-muted">
          {s.questions.confirmWhere}{' '}
          <span className="text-ink">
            {[
              ...(stillToConfirm(state).base ? [s.questions.baseHeading] : []),
              ...stillToConfirm(state).categories,
            ].join(' · ')}
          </span>
        </p>
      ) : null}
    </div>
  );
}
