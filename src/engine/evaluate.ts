// Per product: welke vragen zijn beantwoord, wat staat er op de Selection-checklist,
// en waar zit elk gat vandaan (§7).

import type {
  Dataset, GapCause, Gap, ProductRecord, ProductResult, Protocol,
  ProtocolProductResult, QuestionSet, QuestionOutcome, Tier,
} from '../domain/types';
import { FIELD_BY_KEY } from '../spec/fields';
import { isBlank, parseBool, str } from '../intake/normalize';
import { OUT_CHECKS, SELECTION_CHECKLIST } from './checklists';
import { mainCategory } from '../questions/generate';

/**
 * Kwaliteitsdrempels. Aanwezigheid is niet hetzelfde als bruikbaarheid: een
 * omschrijving van vier woorden vult het veld maar beantwoordt geen vraag.
 * Dit is precies waar de platformvalidatie stopt en wij doorgaan (§10).
 */
export const MIN_WORDS: Record<string, number> = {
  description: 8,
  title: 3,
};

/** Heeft dit product een bruikbare waarde voor deze eis? */
export function satisfies(product: ProductRecord, requirement: string): boolean {
  // "attr:patroon" kijkt in de kolommen die we niet konden plaatsen — daar zit
  // de categoriespecifieke informatie die geen enkele spec benoemt.
  if (requirement.startsWith('attr:')) {
    const re = new RegExp(requirement.slice(5), 'i');
    return Object.entries(product.unmapped).some(
      ([column, value]) => re.test(column) && !isBlank(value),
    );
  }

  const value = product.values[requirement];
  if (isBlank(value)) return false;

  const minWords = MIN_WORDS[requirement];
  if (minWords !== undefined) {
    const words = String(value).trim().split(/\s+/).filter(Boolean).length;
    if (words < minWords) return false;
  }
  return true;
}

/**
 * Telt deze vraag mee voor dit protocol?
 *
 * De trechter wordt per protocol apart berekend omdat de beschikbare velden
 * verschillen (§5). Een vraag die alleen te beantwoorden is via een veld dat de
 * specificatie niet kent, mag daar niet als gat gelden — dan straffen we een
 * merchant voor iets wat het protocol zelf niet vraagt.
 *
 * Een "attr:"-eis blijft altijd van toepassing: dat is de eigen data van de
 * merchant, en die kan in elk protocol in een omschrijving of detailveld landen.
 */
function applicableTo(requires: string[], protocol: Protocol): boolean {
  return requires.some((r) => r.startsWith('attr:') || FIELD_BY_KEY[r]?.[protocol] !== undefined);
}

function answersQuestion(product: ProductRecord, requires: string[], mode: 'any' | 'all') {
  const missing = requires.filter((r) => !satisfies(product, r));
  const answered = mode === 'any' ? missing.length < requires.length : missing.length === 0;
  return { answered, missing: answered ? [] : missing };
}

/**
 * Kies de vragenset bij de eigen categorie van het product.
 *
 * De generator groepeert op hoofdcategorie — het eerste segment van het pad —
 * dus daar matchen we ook op. Anders valt "Fietsbanden > Racefiets" buiten de
 * set die juist voor Fietsbanden is gemaakt.
 */
export function pickSet(product: ProductRecord, sets: QuestionSet[]): QuestionSet | undefined {
  const category = mainCategory(product.values);
  if (!category) return undefined; // geen categorie -> geflagd en geteld, niet gescoord (§6)

  for (const set of sets) {
    if (!set.match) continue;
    if (new RegExp(set.match, 'i').test(category)) return set;
  }
  return sets.find((s) => !s.match); // de vangnet-set voor de kleine categorieën
}

/**
 * Waar komt dit gat vandaan? De kern van §7.
 *
 * Zonder catalogus kunnen we mapping- en enrichment-gaps niet uit elkaar houden;
 * dan classificeren we op eigenaar en zegt het rapport erbij dat de attributie
 * beperkt is. Dat is eerlijker dan gokken.
 */
export function classifyGap(
  key: string,
  catalog: Dataset | undefined,
  catalogProduct: ProductRecord | undefined,
): GapCause {
  const owner = FIELD_BY_KEY[key]?.owner;

  if (catalog) {
    if (catalogProduct && satisfies(catalogProduct, key)) return 'mapping';
    // Kolom bestaat in de catalogus maar is leeg: het systeem kán het dragen.
    if (catalog.presentKeys.includes(key)) return 'enrichment';
  }

  // Reviews en retouren komen uit systemen die geen van beide bronnen dekt.
  if (owner === 'reviews' || owner === 'returns') return 'no-source';
  return 'enrichment';
}

/** Maak van een "attr:"-patroon weer iets dat een mens kan lezen. */
function readableField(key: string): string {
  return key
    .slice(5)
    .replace(/[$^\\]/g, '')
    .replace(/\|/g, ' / ')
    .replace(/[_.]+/g, ' ')
    .trim();
}

function gapFor(
  key: string,
  tier: Tier,
  catalog: Dataset | undefined,
  catalogProduct: ProductRecord | undefined,
): Gap {
  const def = FIELD_BY_KEY[key];
  const readable = key.startsWith('attr:') ? readableField(key) : key;
  return {
    field: key,
    label: def?.label ?? { nl: readable, en: readable },
    tier,
    cause: classifyGap(key, catalog, catalogProduct),
    owner: def?.owner ?? 'pim',
    affected: 1,
  };
}

function evaluateProtocol(
  product: ProductRecord,
  set: QuestionSet | undefined,
  protocol: Protocol,
): ProtocolProductResult {
  const questions: QuestionOutcome[] = [];
  if (set) {
    for (const question of set.questions) {
      if (question.disabled) continue;
      if (!applicableTo(question.requires, protocol)) continue;
      const { answered, missing } = answersQuestion(product, question.requires, question.mode);
      questions.push({ questionId: question.id, label: question.label, answered, missing });
    }
  }

  const selection = SELECTION_CHECKLIST[protocol].map((item) => ({
    id: item.id,
    label: item.label,
    present: item.requires.some((r) => satisfies(product, r)),
  }));

  const outWarnings = OUT_CHECKS[protocol].map((check) => ({
    id: check.id,
    label: check.label,
    // Alleen een expliciete waarheidswaarde telt. Ontbreekt het veld, dan is het
    // antwoord nee — bij UCP zelfs stilzwijgend.
    present: parseBool(product.values[check.field]) === true,
  }));

  return {
    // Vindbaar: élke fit-vraag van de categorie beantwoord. Geen percentage (§5).
    findable: set !== undefined && questions.length > 0 && questions.every((q) => q.answered),
    competitive: selection.every((s) => s.present),
    questions,
    selection,
    outWarnings,
  };
}

export function evaluateProduct(
  product: ProductRecord,
  sets: QuestionSet[],
  catalog: Dataset | undefined,
  /** Het bijbehorende catalogusrecord, al opgezocht door de aanroeper. */
  catalogProduct: ProductRecord | undefined,
): ProductResult {
  const set = pickSet(product, sets);

  const perProtocol = {
    acp: evaluateProtocol(product, set, 'acp'),
    ucp: evaluateProtocol(product, set, 'ucp'),
  };

  // Verzamel de ontbrekende velden uit beide protocollen, zonder dubbelingen.
  const gaps = new Map<string, Gap>();
  for (const protocol of ['acp', 'ucp'] as Protocol[]) {
    const result = perProtocol[protocol];
    for (const question of result.questions) {
      if (question.answered) continue;
      for (const key of question.missing) {
        // Een veld dat dit protocol niet kent, is voor dit protocol geen gat.
        if (!key.startsWith('attr:') && FIELD_BY_KEY[key]?.[protocol] === undefined) continue;
        if (!gaps.has(key)) gaps.set(key, gapFor(key, 'core', catalog, catalogProduct));
      }
    }
    for (const item of result.selection) {
      if (item.present) continue;
      const requires = SELECTION_CHECKLIST[protocol].find((c) => c.id === item.id)?.requires ?? [];
      // Bij een 'any'-eis rapporteren we het eerste veld als representant.
      const key = requires[0];
      if (key && !gaps.has(key)) gaps.set(key, gapFor(key, 'selection', catalog, catalogProduct));
    }
  }

  return {
    key: product.key,
    title: str(product.values.title),
    category: str(product.values.product_type) ?? str(product.values.product_category),
    setId: set?.id,
    unmatched: set === undefined,
    perProtocol,
    gaps: [...gaps.values()],
  };
}
