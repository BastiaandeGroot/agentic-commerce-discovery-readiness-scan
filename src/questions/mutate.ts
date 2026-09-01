// Bewerkingen op vragensets, met changelog.
//
// De changelog is niet administratief maar dragend (§8). Een score kan bewegen
// zonder dat de merchant iets aan zijn data deed — omdat de spec veranderde, of
// omdat de vragenset veranderde. Zonder vastlegging van het tweede is vergelijken
// over tijd betekenisloos, en kun je echte vooruitgang niet onderscheiden van
// een verschoven definitie.

import type { ChangeLogAction, Question, QuestionSetState } from '../domain/types';

function record(
  state: QuestionSetState,
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
      { at: new Date().toISOString(), setId, questionId, action, before, after },
    ],
  };
}

export function editQuestion(
  state: QuestionSetState,
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
  return record(next, setId, questionId, 'edited', before, label.nl);
}

/** Uitzetten in plaats van weggooien: de vraag blijft zichtbaar, telt niet mee. */
export function toggleQuestion(
  state: QuestionSetState,
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
  return record(next, setId, questionId, disabled ? 'disabled' : 'enabled');
}

export function addQuestion(
  state: QuestionSetState,
  setId: string,
  label: { nl: string; en: string },
  requires: string[],
): QuestionSetState {
  const set = state.sets.find((s) => s.id === setId);
  if (!set || requires.length === 0) return state;

  const question: Question = {
    id: `c${Date.now().toString(36)}`,
    label,
    requires,
    mode: 'any',
    custom: true,
    origin: 'derived',
  };
  const next = {
    ...state,
    sets: state.sets.map((s) => (s.id !== setId ? s : { ...s, questions: [...s.questions, question] })),
  };
  return record(next, setId, question.id, 'added', undefined, label.nl);
}

/** Merchant bevestigt de set. Geen mutatie, dus geen versieverhoging. */
export function markValidated(state: QuestionSetState, setId: string): QuestionSetState {
  return {
    ...state,
    sets: state.sets.map((s) => (s.id === setId ? { ...s, validated: true } : s)),
  };
}

export function allValidated(state: QuestionSetState): boolean {
  return state.sets.every((s) => s.validated);
}
