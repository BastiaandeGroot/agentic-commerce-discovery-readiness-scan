// Wat de merchant op zijn vragensets deed, los van de sets zelf.
//
// De sets worden steeds opnieuw samengesteld: een andere koppeling, een andere
// vragenset per categorie, een nieuwe bankversie. Elke keer kwam er een verse
// set uit, en was weg wat de merchant had gedaan — uitgezette vragen, aangepaste
// teksten, eigen vragen, bevestigingen. Dit legt dat werk apart vast en legt het
// na elke samenstelling weer over de verse sets heen.
//
// Twee regels houden het eerlijk:
//
//   - **Een aangepaste tekst blijft alleen staan als de bank dezelfde vraag
//     stelt.** Heeft een nieuwe bankversie de vraag herschreven, dan was de
//     aanpassing een antwoord op een tekst die er niet meer is.
//   - **Een bevestiging blijft alleen staan als de vragen niet veranderd zijn.**
//     Een categorie bevestigd houden terwijl er nieuwe vragen in staan, is een
//     oordeel over iets wat de merchant niet gezien heeft. Zo'n categorie komt
//     terug op het scherm, met de melding waarom.
//
// Puur: geen klok, geen opslag. Waar het werk bewaard wordt, is `src/storage`.

import type { Bilingual, ChangeLogEntry, Question, QuestionSet, QuestionSetState } from '../domain/types';

/** Wat de merchant in één categorie deed. */
export interface SetWork {
  /** Bevestigd, met de vingerafdruk van de vragen op dat moment. */
  validated?: { fingerprint: string };
  /** Id's van uitgezette vragen. */
  disabled: string[];
  /** Aangepaste teksten, met de tekst uit de bank waarop de aanpassing gold. */
  edited: { questionId: string; from: string; label: Bilingual }[];
  /** Eigen vragen, in hun geheel. */
  added: Question[];
}

export interface QuestionWork {
  /** De versie van deze vorm; omhoog als hij verandert. */
  format: 1;
  stateVersion: number;
  changeLog: ChangeLogEntry[];
  /** De algemene vragen bevestigd, met hun vingerafdruk op dat moment. */
  baseValidated?: { fingerprint: string };
  /** Per categorie; de sleutel is de categorienaam van de merchant. */
  sets: Record<string, SetWork>;
}

/** De sleutel van een set: zijn eigen categorienaam, die blijft over samenstellingen heen. */
export const setKey = (set: QuestionSet): string => set.category ?? set.id;

/** FNV-1a, 32 bits. Deterministisch en genoeg om een verschil te zien. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, '0');
}

const questionPrint = (question: Question) =>
  `${question.id}:${question.label.nl}:${question.importance ?? ''}:${question.answerable ?? ''}`;

/** De vragen uit de bank in deze set, zonder de eigen vragen van de merchant. */
export function setFingerprint(set: QuestionSet): string {
  return hash(set.questions.filter((question) => !question.custom).map(questionPrint).join('|'));
}

/** De algemene vragen, één keer elk, in vaste volgorde. */
export function baseFingerprint(state: QuestionSetState): string {
  const seen = new Map<string, string>();
  for (const set of state.sets) {
    for (const question of set.questions) {
      if (question.layer === 'base' && !seen.has(question.id)) {
        seen.set(question.id, `${question.id}:${question.label.nl}`);
      }
    }
  }
  return hash([...seen.keys()].sort().map((id) => seen.get(id)).join('|'));
}

/**
 * Het werk uit de huidige sets halen.
 *
 * `pristine` is dezelfde samenstelling zonder het werk erover: alleen daarin
 * staat nog de tekst uit de bank, en die is nodig om later te zien of een
 * aanpassing nog op dezelfde vraag slaat.
 */
export function extractWork(current: QuestionSetState, pristine: QuestionSetState): QuestionWork {
  const sets: Record<string, SetWork> = {};

  for (const set of current.sets) {
    const key = setKey(set);
    const original = pristine.sets.find((candidate) => setKey(candidate) === key);

    const edited: SetWork['edited'] = [];
    for (const question of set.questions) {
      if (question.custom) continue;
      const from = original?.questions.find((candidate) => candidate.id === question.id);
      if (from && (from.label.nl !== question.label.nl || from.label.en !== question.label.en)) {
        edited.push({ questionId: question.id, from: from.label.nl, label: question.label });
      }
    }

    const work: SetWork = {
      validated: set.validated && original ? { fingerprint: setFingerprint(original) } : undefined,
      disabled: set.questions.filter((question) => question.disabled).map((question) => question.id),
      edited,
      added: set.questions.filter((question) => question.custom),
    };

    if (work.validated || work.disabled.length > 0 || work.edited.length > 0 || work.added.length > 0) {
      sets[key] = work;
    }
  }

  return {
    format: 1,
    stateVersion: current.version,
    changeLog: current.changeLog,
    baseValidated: current.baseValidated ? { fingerprint: baseFingerprint(pristine) } : undefined,
    sets,
  };
}

export interface AppliedWork {
  state: QuestionSetState;
  /** Categorieën die opnieuw bevestigd moeten worden: hun vragen veranderden. */
  reconfirm: string[];
  /** De algemene vragen veranderden en moeten opnieuw bevestigd worden. */
  baseChanged: boolean;
  /** Aangepaste teksten die vervielen omdat de bank de vraag herschreef. */
  droppedEdits: number;
}

/** Het werk over een verse samenstelling leggen. */
export function applyWork(pristine: QuestionSetState, work: QuestionWork | undefined): AppliedWork {
  if (!work) return { state: pristine, reconfirm: [], baseChanged: false, droppedEdits: 0 };

  const reconfirm: string[] = [];
  let droppedEdits = 0;

  const sets = pristine.sets.map((set) => {
    const done = work.sets[setKey(set)];
    if (!done) return set;

    const questions = set.questions.map((question) => {
      let next = question;
      if (done.disabled.includes(question.id)) next = { ...next, disabled: true };
      const edit = done.edited.find((entry) => entry.questionId === question.id);
      if (edit) {
        if (edit.from === question.label.nl) next = { ...next, label: edit.label };
        else droppedEdits += 1;
      }
      return next;
    });

    const present = new Set(questions.map((question) => question.id));
    const added = done.added.filter((question) => !present.has(question.id));

    let validated = false;
    if (done.validated) {
      if (done.validated.fingerprint === setFingerprint(set)) validated = true;
      else reconfirm.push(setKey(set));
    }

    return { ...set, questions: [...questions, ...added], validated };
  });

  let baseValidated = false;
  let baseChanged = false;
  if (work.baseValidated) {
    if (work.baseValidated.fingerprint === baseFingerprint(pristine)) baseValidated = true;
    else baseChanged = true;
  }

  return {
    state: {
      ...pristine,
      sets,
      baseValidated,
      version: Math.max(pristine.version, work.stateVersion),
      changeLog: work.changeLog,
    },
    reconfirm,
    baseChanged,
    droppedEdits,
  };
}
