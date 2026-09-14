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

/**
 * Een algemene vraag bewerken, overal tegelijk.
 *
 * Hij staat in élke categorie onder hetzelfde id en met dezelfde tekst; hem in
 * één set aanpassen zou betekenen dat twee categorieën verschillende dingen
 * meten onder hetzelfde id — precies wat de laagopzet moet voorkomen.
 */
export function editBaseQuestion(
  state: QuestionSetState,
  at: string,
  questionId: string,
  label: { nl: string; en: string },
): QuestionSetState {
  return state.sets.reduce(
    (acc, set) => (set.questions.some((q) => q.id === questionId && q.layer === 'base')
      ? editQuestion(acc, at, set.id, questionId, label)
      : acc),
    state,
  );
}

/** Een algemene vraag uit- of aanzetten, overal tegelijk. Zelfde reden. */
export function toggleBaseQuestion(
  state: QuestionSetState,
  at: string,
  questionId: string,
): QuestionSetState {
  // De stand van de eerste set is leidend, anders wisselt elke set zijn eigen
  // kant op en staat de vraag daarna in de helft aan en in de helft uit.
  const wanted = !state.sets
    .flatMap((set) => set.questions)
    .find((q) => q.id === questionId)?.disabled;

  return state.sets.reduce((acc, set) => {
    const question = set.questions.find((q) => q.id === questionId && q.layer === 'base');
    if (!question || question.disabled === wanted) return acc;
    return toggleQuestion(acc, at, set.id, questionId);
  }, state);
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

/**
 * De algemene vragen bevestigen, in één keer voor alle categorieën.
 *
 * Ze zijn per definitie overal dezelfde vraag — een overlay mag herwegen maar
 * niet herschrijven — dus ze vier keer voorleggen vraagt vier keer hetzelfde
 * oordeel. Wie dat moet doen leest de vierde keer niet meer, en dan is de
 * bevestiging een klik geworden in plaats van een oordeel.
 */
export function toggleBaseValidated(state: QuestionSetState): QuestionSetState {
  return { ...state, baseValidated: !state.baseValidated };
}

/** Draagt deze set eigen vragen, of is hij helemaal de basislaag? */
export function hasOwnQuestions(set: QuestionSetState['sets'][number]): boolean {
  return set.questions.some((question) => question.layer === 'category');
}

/**
 * De algemene vragen, één keer, met waar ze anders wegen.
 *
 * Uit de samengestelde sets en niet uit de bank: alleen de sets weten welke
 * vragen deze merchant werkelijk gesteld krijgt, en welke een categorie heeft
 * uitgeschakeld.
 */
export function baseQuestions(state: QuestionSetState): {
  question: QuestionSetState['sets'][number]['questions'][number];
  /** Categorieën waar deze vraag zwaarder of lichter weegt dan hier. */
  reweighted: { category: string; importance: string }[];
}[] {
  const out = new Map<string, {
    question: QuestionSetState['sets'][number]['questions'][number];
    reweighted: { category: string; importance: string }[];
  }>();

  for (const set of state.sets) {
    for (const question of set.questions) {
      if (question.layer !== 'base') continue;
      const entry = out.get(question.id);
      if (!entry) {
        out.set(question.id, { question, reweighted: [] });
        continue;
      }
      // Zelfde vraag, ander gewicht: dat is geen tweede vraag maar een
      // aantekening bij deze. Hem apart tonen zou de lijst verdubbelen.
      if (question.importance !== entry.question.importance
        && set.category !== undefined
        && !entry.reweighted.some((r) => r.category === set.category)) {
        entry.reweighted.push({
          category: set.category,
          importance: question.importance ?? 'medium',
        });
      }
    }
  }
  return [...out.values()];
}

/**
 * Alles bevestigd?
 *
 * De algemene vragen één keer, en daarna elke categorie die eigen vragen heeft.
 * Een categorie zónder eigen vragen bestaat helemaal uit de basislaag: die is
 * met die ene bevestiging al gezien, en er nog een keer om vragen zou een lege
 * handeling zijn.
 */
export function allValidated(state: QuestionSetState): boolean {
  if (!state.baseValidated) return false;
  return state.sets.filter(hasOwnQuestions).every((s) => s.validated);
}

/**
 * Een vraag die geen enkele onderzochte webshop behandelt.
 *
 * Exact 0 en niet `null`: 0 is een vondst (niemand behandelt dit), `null` is een
 * onderwerp dat niet onderzocht is. Die twee samen uitzetten zou een vraag laten
 * vallen omdat wíj niet keken. Een eigen vraag van de merchant heeft geen
 * dekking en valt er dus nooit onder.
 */
export function isUncovered(question: Question): boolean {
  return question.coverage === 0 && !question.custom;
}

/**
 * De eigen vragen van één categorie zonder dekking uitzetten.
 *
 * Alleen de categorievragen: een algemene vraag hier uitzetten zou hem in de ene
 * categorie uit en in de andere aan laten staan, en dan meten twee categorieën
 * iets anders onder hetzelfde id. Daarvoor is `disableUncoveredBase`. Per vraag
 * terug te draaien, en elke vraag krijgt zijn eigen changelogregel.
 */
export function disableUncovered(state: QuestionSetState, at: string, setId: string): QuestionSetState {
  const set = state.sets.find((candidate) => candidate.id === setId);
  if (!set) return state;
  return set.questions
    .filter((question) => question.layer === 'category' && isUncovered(question) && !question.disabled)
    .reduce((acc, question) => toggleQuestion(acc, at, setId, question.id), state);
}

/** De algemene vragen zonder dekking uitzetten, in elke categorie tegelijk. */
export function disableUncoveredBase(state: QuestionSetState, at: string): QuestionSetState {
  return baseQuestions(state)
    .map((entry) => entry.question)
    .filter((question) => isUncovered(question) && !question.disabled)
    .reduce((acc, question) => toggleBaseQuestion(acc, at, question.id), state);
}

/**
 * Op dekking, hoog naar laag.
 *
 * Wat de meeste webshops in de markt behandelen, is het zekerst iets waar een
 * koper naar vraagt, en dat hoort bovenaan te staan bij het nalopen. Niet
 * onderzocht staat onderaan, want daar zegt de dekking niets. Bij gelijke dekking
 * blijft de volgorde uit de bank staan.
 */
export function byCoverage<T>(items: T[], coverageOf: (item: T) => number | null | undefined): T[] {
  const rank = (item: T) => {
    const coverage = coverageOf(item);
    return coverage === null || coverage === undefined ? -1 : coverage;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(b.item) - rank(a.item) || a.index - b.index)
    .map((entry) => entry.item);
}

/**
 * Wat nog bevestigd moet worden voordat de scan kan draaien.
 *
 * Een ja of nee (`allValidated`) zegt de merchant niet wáár hij moet kijken; bij
 * tien categorieën zoekt hij dan blok voor blok. Dit noemt het: de algemene
 * vragen, en de categorieën met eigen vragen die nog open staan.
 */
export function stillToConfirm(state: QuestionSetState): { base: boolean; categories: string[] } {
  return {
    base: !state.baseValidated,
    categories: state.sets
      .filter((set) => hasOwnQuestions(set) && !set.validated)
      .map((set) => set.label.nl),
  };
}
