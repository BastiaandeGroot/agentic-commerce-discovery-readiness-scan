// Bewerkingen op vragensets, met changelog.
//
// De changelog is niet administratief maar dragend (§8). Een score kan bewegen
// zonder dat de merchant iets aan zijn data deed — omdat de spec veranderde, of
// omdat de vragenset veranderde. Zonder vastlegging van het tweede is vergelijken
// over tijd betekenisloos, en kun je echte vooruitgang niet onderscheiden van
// een verschoven definitie.

import type { ChangeLogAction, Question, QuestionSet, QuestionSetState } from '../domain/types';

function record(
  state: QuestionSetState,
  at: string,
  setId: string,
  questionId: string,
  action: ChangeLogAction,
  before?: string,
  after?: string,
): QuestionSetState {
  return {
    ...state,
    // Elke mutatie verhoogt de versie; die versie staat op elk rapport.
    version: state.version + 1,
    changeLog: [
      ...state.changeLog,
      { at, setId, questionId, action, before, after },
    ],
  };
}

/**
 * Volgnummer voor een zelf toegevoegde vraag.
 *
 * Bewust geen tijdstempel: dan hangt de inhoud van een vragenset af van wanneer
 * iemand op de knop drukte, en zijn twee sets met dezelfde vragen toch niet
 * gelijk. Dit telt door op wat er al staat.
 */
function nextCustomId(set: QuestionSet): string {
  const hoogste = set.questions
    .map((q) => /^c(\d+)$/.exec(q.id)?.[1])
    .filter((n): n is string => n !== undefined)
    .reduce((max, n) => Math.max(max, Number(n)), 0);
  return `c${hoogste + 1}`;
}

export function editQuestion(
  state: QuestionSetState,
  at: string,
  setId: string,
  questionId: string,
  label: { nl: string; en: string },
): QuestionSetState {
  const set = state.sets.find((s) => s.id === setId);
  const question = set?.questions.find((q) => q.id === questionId);
  if (!set || !question) return state;
  if (question.label.nl === label.nl && question.label.en === label.en) return state;

  const before = question.label.nl;
  const next = {
    ...state,
    sets: state.sets.map((s) =>
      s.id !== setId ? s : { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, label } : q)) },
    ),
  };
  return record(next, at, setId, questionId, 'edited', before, label.nl);
}

/** Uitzetten in plaats van weggooien: de vraag blijft zichtbaar, telt niet mee. */
export function toggleQuestion(
  state: QuestionSetState,
  at: string,
  setId: string,
  questionId: string,
): QuestionSetState {
  const set = state.sets.find((s) => s.id === setId);
  const question = set?.questions.find((q) => q.id === questionId);
  if (!set || !question) return state;

  const disabled = !question.disabled;
  const next = {
    ...state,
    sets: state.sets.map((s) =>
      s.id !== setId ? s : { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, disabled } : q)) },
    ),
  };
  return record(next, at, setId, questionId, disabled ? 'disabled' : 'enabled');
}

export function addQuestion(
  state: QuestionSetState,
  at: string,
  setId: string,
  label: { nl: string; en: string },
  requires: string[],
): QuestionSetState {
  const set = state.sets.find((s) => s.id === setId);
  if (!set || requires.length === 0) return state;

  const question: Question = {
    id: nextCustomId(set),
    label,
    requires,
    mode: 'any',
    custom: true,
    origin: 'custom',
  };
  const next = {
    ...state,
    sets: state.sets.map((s) => (s.id !== setId ? s : { ...s, questions: [...s.questions, question] })),
  };
  return record(next, at, setId, question.id, 'added', undefined, label.nl);
}

/**
 * Bevestiging aan- of uitzetten.
 *
 * Terugdraaibaar met opzet: bevestigen is een oordeel van de merchant, en wie
 * halverwege het nakijken bedenkt dat een set toch niet klopt, moet dat kunnen
 * terugnemen zonder opnieuw te beginnen. Het is geen inhoudelijke wijziging aan
 * de vragen, dus de versie beweegt niet mee en er komt geen changelogregel bij.
 */
export function toggleValidated(state: QuestionSetState, setId: string): QuestionSetState {
  return {
    ...state,
    sets: state.sets.map((s) => (s.id === setId ? { ...s, validated: !s.validated } : s)),
  };
}

export function allValidated(state: QuestionSetState): boolean {
  return state.sets.every((s) => s.validated);
}
