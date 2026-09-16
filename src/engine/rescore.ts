// Een bewaarde analyse herberekenen nadat de merchant zijn vragen bijstelde.
//
// Een snapshot draagt geen producten, en toch hoort een vraag die de merchant na
// de scan uitzette meteen uit zijn rapport te verdwijnen. Opnieuw meten kan niet
// zonder de catalogus, maar dat hoeft ook niet: uitzetten verandert geen enkel
// antwoord, het haalt alleen een vraag uit de telling. Daarom bewaart de scan per
// product welke vraag in welke toestand stond, en telt deze module dat opnieuw op
// met dezelfde regels als de scan (`assembleResult`, `aggregateScan`).
//
// Wat hier staat is geen productdata: geen sleutel, geen titel, geen waarde. Per
// product een rij toestanden tegen vraag-id's, de sets waar het onder hing, en
// welke velden een onbeantwoorde vraag miste — veldnamen, zoals elk gat al draagt.
// Los van de catalogus is een rij niet naar een product terug te voeren.
//
// Wat niet gemeten is, wordt niet verzonnen. Een vraag die bij de scan uitstond of
// die de merchant daarna toevoegde heeft geen toestand; die telt niet mee en staat
// als `unmeasured` in de uitkomst, zodat het scherm kan zeggen dat een nieuwe scan
// nodig is.
//
// Puur: geen klok, geen opslag.

import type {
  AnswerState, Bilingual, Dataset, Gap, GapCause, OwnerSystem, ProductResult, QuestionSetState, ScanReport,
} from '../domain/types';
import { assembleResult } from './evaluate';
import { aggregateScan } from './report';

/** De versie van deze vorm; omhoog als hij verandert. */
export const OUTCOMES_FORMAT = 1;

const STATE_CODE: Record<AnswerState, string> = {
  answered: 'a', unusable: 'u', incomplete: 'i', empty: 'e', absent: 'x',
};
const CODE_STATE: Record<string, AnswerState> = Object.fromEntries(
  Object.entries(STATE_CODE).map(([state, code]) => [code, state as AnswerState]),
);
/** Niet gesteld bij dit product. */
const NOT_ASKED = '.';

export interface ScanOutcomes {
  format: typeof OUTCOMES_FORMAT;
  /** Alle vraag-id's die bij enig product gesteld zijn; de volgorde is die van `states`. */
  questionIds: string[];
  setIds: string[];
  subcategories: string[];
  /** Elk veld dat ergens een gat was, met hoe het rapport het noemt. */
  gapFields: { field: string; label: Bilingual; cause: GapCause; owner: OwnerSystem }[];
  /**
   * Welke velden een onbeantwoorde vraag miste, ontdubbeld: dezelfde combinatie
   * komt bij veel producten terug. Elk item is een lijst [vraagindex, veldindex…].
   */
  missing: number[][][];
  /**
   * Welke kolommen een beantwoorde vraag droegen, op dezelfde manier ontdubbeld:
   * elk item is een lijst [vraagindex, veldindex in `foundFields`…]. Ontbreekt bij
   * metingen van vóór 16 september; dan is niet te zeggen waarmee beantwoord is.
   */
  found?: number[][][];
  /** Veldnamen voor `found`. */
  foundFields?: string[];
  /**
   * Eén rij per product: [sets, subcategorie (-1: geen), kenmerk-alleen (0/1),
   * toestanden, ontbrekende velden (-1: geen), dragende velden (-1: geen)].
   * `toestanden` heeft één teken per vraag uit `questionIds`.
   */
  products: [number[], number, number, string, number, number?][];
}

/** De metingen uit een verse scan halen, om te bewaren. */
export function captureOutcomes(report: ScanReport): ScanOutcomes {
  const index = <T>(list: T[], lookup: Map<string, number>, key: string, value: T) => {
    const found = lookup.get(key);
    if (found !== undefined) return found;
    lookup.set(key, list.length);
    list.push(value);
    return list.length - 1;
  };

  const questionIds: string[] = [];
  const questionIndex = new Map<string, number>();
  for (const product of report.products) {
    for (const question of product.questions) index(questionIds, questionIndex, question.questionId, question.questionId);
  }

  const setIds: string[] = [];
  const setIndex = new Map<string, number>();
  const subcategories: string[] = [];
  const subIndex = new Map<string, number>();
  const gapFields: ScanOutcomes['gapFields'] = [];
  const gapIndex = new Map<string, number>();
  const missing: number[][][] = [];
  const missingIndex = new Map<string, number>();
  const found: number[][][] = [];
  const foundIndex = new Map<string, number>();
  const foundFields: string[] = [];
  const foundFieldIndex = new Map<string, number>();

  const products = report.products.map((product): ScanOutcomes['products'][number] => {
    const sets = (product.setIds ?? (product.setId ? [product.setId] : []))
      .map((id) => index(setIds, setIndex, id, id));
    const sub = product.subcategory === undefined ? -1 : index(subcategories, subIndex, product.subcategory, product.subcategory);

    const states = new Array<string>(questionIds.length).fill(NOT_ASKED);
    const gapsByQuestion = new Map<string, number[]>();
    for (const gap of product.gaps) {
      const field = index(gapFields, gapIndex, gap.field, { field: gap.field, label: gap.label, cause: gap.cause, owner: gap.owner });
      for (const questionId of gap.questions) {
        gapsByQuestion.set(questionId, [...(gapsByQuestion.get(questionId) ?? []), field]);
      }
    }
    const signature: number[][] = [];
    const carried: number[][] = [];
    for (const question of product.questions) {
      const at = questionIndex.get(question.questionId) as number;
      states[at] = STATE_CODE[question.state];
      const fields = gapsByQuestion.get(question.questionId);
      if (fields) signature.push([at, ...fields]);
      if (question.answered && question.found.length > 0) {
        carried.push([at, ...question.found.map((field) => index(foundFields, foundFieldIndex, field, field))]);
      }
    }
    const miss = signature.length === 0 ? -1 : index(missing, missingIndex, JSON.stringify(signature), signature);
    const carry = carried.length === 0 ? -1 : index(found, foundIndex, JSON.stringify(carried), carried);

    return [sets, sub, product.facetOnly ? 1 : 0, states.join(''), miss, carry];
  });

  return { format: OUTCOMES_FORMAT, questionIds, setIds, subcategories, gapFields, missing, found, foundFields, products };
}

/**
 * Het rapport opnieuw optellen op de vragensets van nu.
 *
 * `state` is de samenstelling van de scan met het huidige werk van de merchant
 * erover. De sets zelf veranderen daardoor niet — alleen welke vragen aanstaan,
 * hun tekst, en eigen vragen erbij — dus elk product hangt nog onder dezelfde sets.
 */
export function rescoreOutcomes(
  outcomes: ScanOutcomes,
  state: QuestionSetState,
  meta: { filename: string; scannedAt: string },
): { report: ScanReport; unmeasured: { setId: string; questionId: string }[] } {
  const setsById = new Map(state.sets.map((set) => [set.id, set]));
  const questionAt = new Map(outcomes.questionIds.map((id, at) => [id, at]));
  const unmeasured = new Map<string, { setId: string; questionId: string }>();
  const gapTable = new Map(outcomes.gapFields.map((gap) => [gap.field, gap]));

  const products: ProductResult[] = outcomes.products.map(([sets, sub, facetOnly, states, miss, carry], row) => {
    const placed = sets.map((at) => setsById.get(outcomes.setIds[at])).filter((set) => set !== undefined);
    const missingFields = new Map<string, string[]>();
    for (const [at, ...fields] of miss >= 0 ? outcomes.missing[miss] : []) {
      missingFields.set(outcomes.questionIds[at], fields.map((field) => outcomes.gapFields[field].field));
    }
    const foundFields = new Map<string, string[]>();
    for (const [at, ...fields] of carry !== undefined && carry >= 0 ? outcomes.found?.[carry] ?? [] : []) {
      foundFields.set(outcomes.questionIds[at], fields.map((field) => outcomes.foundFields?.[field] ?? ''));
    }
    return assembleResult(
      {
        key: `#${row}`,
        subcategory: sub >= 0 ? outcomes.subcategories[sub] : undefined,
        sets: placed,
        facetOnly: facetOnly === 1,
      },
      (question) => {
        const at = questionAt.get(question.id);
        const code = at === undefined ? NOT_ASKED : states[at];
        if (code === NOT_ASKED) {
          const setId = placed.find((set) => set.questions.some((one) => one.id === question.id))?.id ?? placed[0]?.id ?? '';
          unmeasured.set(`${setId}|${question.id}`, { setId, questionId: question.id });
          return undefined;
        }
        return { state: CODE_STATE[code], missing: missingFields.get(question.id) ?? [], found: foundFields.get(question.id) ?? [] };
      },
      (key, questionId): Gap => {
        const gap = gapTable.get(key);
        return {
          field: key,
          label: gap?.label ?? { nl: key, en: key },
          cause: gap?.cause ?? 'unmodelled',
          owner: gap?.owner ?? 'pim',
          affected: 1,
          questions: [questionId],
        };
      },
    );
  });

  // Geen catalogus: alleen de naam, voor wat het rapport erover zegt.
  const catalog: Dataset = {
    filename: meta.filename, format: '', products: [], columns: [], preview: [],
    mapping: {}, unmappedColumns: [], presentKeys: [],
  };
  return {
    report: aggregateScan(products, state, catalog, meta.scannedAt),
    unmeasured: [...unmeasured.values()],
  };
}
