'use client';

// Stap 2: de vragensets valideren.
//
// Dit scherm is geen formaliteit. De sets zijn gegenereerd uit de categorieen en
// kolommen van de merchant, maar het blijven hypotheses; zonder validatielus is
// de eerste aanwijzing dat een set fout was een klacht (S6). Elke wijziging komt
// in de changelog en verhoogt de versie, want zonder dat is vergelijken over tijd
// betekenisloos (S8).

import { useMemo, useState } from 'react';
import type { Dataset, Locale, Question, QuestionSetState } from '../src/domain/types';
import { isScored } from '../src/questions/compose';
import { FIELDS, FIELD_BY_KEY } from '../src/spec/fields';
import {
  addQuestion, allValidated, editQuestion, toggleQuestion, toggleValidated,
} from '../src/questions/mutate';
import type { Strings } from '../src/i18n/strings';
import { Badge, Button, Card, CardTitle, ErrorState } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  catalog: Dataset;
  state: QuestionSetState;
  onChange: (next: QuestionSetState) => void;
  onRun: () => void;
  /** De scan draait; de knop blijft staan met zijn eigen tekst. */
  running?: boolean;
  /** De scan viel om. Zeggen wat er gebeurde, niet stil blijven. */
  error?: string;
}

/** Leesbare omschrijving van wat een vraag nodig heeft. */
function requirementLabel(requirement: string, locale: Locale): string {
  if (requirement.startsWith('attr:')) {
    return requirement.slice(5).replace(/[$^\\]/g, '').replace(/\|/g, ' / ');
  }
  return FIELD_BY_KEY[requirement]?.label[locale] ?? requirement;
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
  critical: 'danger', high: 'accent', medium: 'neutral', low: 'neutral',
} as const;

function QuestionRow({
  s, locale, setId, question, onChange, state,
}: {
  s: Strings; locale: Locale; setId: string; question: Question;
  state: QuestionSetState; onChange: (n: QuestionSetState) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.label[locale]);
  const [why, setWhy] = useState(false);
  const importance = question.importance ?? 'medium';
  const scored = isScored(question);

  function save() {
    const label = { ...question.label, [locale]: draft } as { nl: string; en: string };
    onChange(editQuestion(state, new Date().toISOString(), setId, question.id, label));
    setEditing(false);
  }

  return (
    <li className={`flex flex-wrap items-start gap-3 border-t border-line py-2.5 ${question.disabled ? 'opacity-45' : ''}`}>
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
            <p className="text-sm">{question.label[locale]}</p>
            <p className="mt-0.5 text-xs text-muted">
              {/* Het bewijs per attribuut, niet als één platte lijst velden: een
                  vraag die twee dingen tegelijk vraagt is iets anders dan een
                  vraag die tevreden is met één van de twee. */}
              {s.questions.needs}:{' '}
              {question.evidence && question.evidence.length > 0
                ? question.evidence
                  .map((group) => group.label[locale])
                  .join(question.mode === 'all' ? ' + ' : ' / ')
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
            {!scored ? (
              <p className="mt-1.5 rounded-md bg-surface-2 p-2 text-xs leading-relaxed text-muted">
                {s.questions.notScoredExplain}
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
          <Badge tone={question.origin === 'custom' ? 'accent' : 'neutral'}>
            {question.origin === 'custom' ? s.questions.fromData : s.questions.fromArchetype}
          </Badge>
          <Button variant="quiet" onClick={() => setEditing(true)}>{s.questions.edit}</Button>
          <Button variant="quiet" onClick={() => onChange(toggleQuestion(state, new Date().toISOString(), setId, question.id))}>
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

export function QuestionSetStep({ s, locale, catalog, state, onChange, onRun, running, error }: Props) {
  const [openSet, setOpenSet] = useState<string | undefined>(state.sets[0]?.id);
  const [newLabel, setNewLabel] = useState('');
  const [newField, setNewField] = useState('');

  // Keuzelijst: de canonieke velden plus de eigen kolommen die we niet plaatsten.
  const fieldOptions = useMemo(() => {
    const canonical = FIELDS.map((f) => ({ value: f.key, label: f.label[locale] }));
    const own = catalog.unmappedColumns.map((c) => ({ value: columnPattern(c), label: c }));
    return [...canonical, ...own];
  }, [catalog.unmappedColumns, locale]);

  const ready = allValidated(state);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.questions.intro}>{s.questions.heading}</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="accent">
            {state.sets.length} {s.questions.categoriesFound}
          </Badge>
          <Badge>{s.questions.version} {state.version}</Badge>
          <span className="text-muted">{s.questions.generatedNote}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{s.questions.importanceExplain}</p>
      </Card>

      {state.sets.map((set) => {
        const open = openSet === set.id;
        const active = set.questions.filter((q) => !q.disabled).length;
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
                    <span className="tnum">{active}</span> {locale === 'nl' ? 'vragen' : 'questions'} ·{' '}
                    {s.questions.basedOn}: {set.bankId}
                    {set.bankVersion ? ` ${set.bankVersion}` : ''}
                  </span>
                </span>
              </button>
              {/* Terugdraaibaar: wie halverwege bedenkt dat een set toch niet
                  klopt, moet dat kunnen terugnemen zonder opnieuw te beginnen. */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Een voorlopige bank hoort de merchant te zien, niet te raden:
                    zijn cijfer klopt met de gestelde vragen, maar of dít de
                    vragen zijn is beredeneerd en niet onderzocht. */}
                {set.bankStatus && set.bankStatus !== 'frozen' ? (
                  <Badge tone="warn">{s.bank.status[set.bankStatus]}</Badge>
                ) : null}
                {set.validated ? <Badge tone="ok">✓ {s.questions.validated}</Badge> : null}
                <Button
                  variant={set.validated ? 'quiet' : 'secondary'}
                  onClick={() => onChange(toggleValidated(state, set.id))}
                >
                  {set.validated ? s.questions.unvalidate : s.questions.validate}
                </Button>
              </div>
            </div>

            {open ? (
              <>
                <ul className="mt-3">
                  {set.questions.map((question) => (
                    <QuestionRow
                      key={question.id}
                      s={s} locale={locale} setId={set.id} question={question}
                      state={state} onChange={onChange}
                    />
                  ))}
                </ul>

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
              </>
            ) : null}
          </Card>
        );
      })}

      <Card>
        <CardTitle>{s.questions.changeLog}</CardTitle>
        {state.changeLog.length === 0 ? (
          <p className="text-sm text-muted">{s.questions.noChanges}</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {state.changeLog.map((entry, i) => (
              <li key={i} className="flex flex-wrap gap-2 border-t border-line py-1.5">
                <span className="tnum text-xs text-muted">
                  {new Date(entry.at).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}
                </span>
                <span className="text-muted">{entry.setId} · {entry.questionId}</span>
                <span>{s.questions.changeActions[entry.action]}</span>
                {entry.before && entry.after ? (
                  <span className="text-muted">“{entry.before}” → “{entry.after}”</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onRun} disabled={!ready} loading={running}>{s.questions.runScan}</Button>
        {error ? (
          <div className="mt-3 w-full">
            <ErrorState title={s.errors.scanFailed} body={error} next={s.errors.scanFailedNext} />
          </div>
        ) : null}
        <span className="text-sm text-muted">
          {ready ? s.questions.allValidated : s.questions.validateFirst}
        </span>
      </div>
    </div>
  );
}
