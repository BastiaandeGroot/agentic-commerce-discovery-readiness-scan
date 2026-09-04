// Per product: welke vragen kan de catalogus beantwoorden, en waar strandt de rest?
//
// De volgorde van dit bestand is de volgorde van de redenering. Eerst: draagt één
// veld een bruikbaar antwoord (`fieldState`). Dan: draagt een attribuut het
// (`groupSatisfied`). Dan: is de vraag daarmee beantwoord. En pas daarna, als het
// antwoord er niet is: waaróm niet, want dat is wat een merchant nodig heeft.
//
// Het onderscheid dat dit bestand draagt en dat een simpele leeg-of-niet-controle
// niet kan maken: staat het veld er wel maar is het niet ingevuld, of kent de
// catalogus het kenmerk helemaal niet? Het eerste is invulwerk van een middag per
// productgroep, het tweede vraagt eerst een verandering in het datamodel. Dat is
// niet hetzelfde budget en niet dezelfde persoon.

import type {
  AnswerState, Dataset, GapCause, Gap, ProductRecord, ProductResult,
  Question, QuestionSet, QuestionOutcome, RequirementGroup,
} from '../domain/types';
import { CUSTOM_IMPORTANCE, isScored, weightOf } from '../questions/compose';
import { FIELD_BY_KEY } from '../spec/fields';
import { isBlank, str } from '../intake/normalize';
import { mainCategory } from './join';

/**
 * Kwaliteitsdrempels. Aanwezigheid is niet hetzelfde als bruikbaarheid: een
 * omschrijving van vier woorden vult het veld maar beantwoordt geen vraag.
 */
export const MIN_WORDS: Record<string, number> = {
  description: 8,
  title: 3,
};

/**
 * De toestand van één veld bij één product.
 *
 * `weak` is het geval dat een boolean wegpoetst: het veld is gevuld, maar met te
 * weinig om een vraag te beantwoorden. Dat vraagt om redactie van iets wat er al
 * staat, en dat is een andere opdracht dan aanvullen.
 */
export type FieldState = 'ok' | 'weak' | 'absent';

export function fieldState(product: ProductRecord, requirement: string): FieldState {
  // "attr:patroon" kijkt in de kolommen die we niet konden plaatsen — daar zit
  // de categoriespecifieke informatie waar geen enkele standaard een naam voor heeft.
  if (requirement.startsWith('attr:')) {
    const re = new RegExp(requirement.slice(5), 'i');
    const hit = Object.entries(product.unmapped).some(
      ([column, value]) => re.test(column) && !isBlank(value),
    );
    return hit ? 'ok' : 'absent';
  }

  const value = product.values[requirement];
  if (isBlank(value)) return 'absent';

  const minWords = MIN_WORDS[requirement];
  if (minWords !== undefined) {
    const words = String(value).trim().split(/\s+/).filter(Boolean).length;
    if (words < minWords) return 'weak';
  }
  return 'ok';
}

/** Draagt dit product een bruikbare waarde voor deze eis? */
export function satisfies(product: ProductRecord, requirement: string): boolean {
  return fieldState(product, requirement) === 'ok';
}

/**
 * Kent de catalogus dit veld überhaupt?
 *
 * Dit is de vraag die het verschil maakt tussen invulwerk en modelwerk. Hij gaat
 * over de export als geheel en niet over dit ene product: een kolom die bij
 * negen van de tien producten gevuld is, bestaat — de tiende is dan gewoon niet
 * ingevuld, en dat is een heel ander gesprek dan "dit kenmerk leggen we nergens
 * vast".
 */
export function catalogKnows(catalog: Dataset, requirement: string): boolean {
  if (requirement.startsWith('attr:')) {
    const re = new RegExp(requirement.slice(5), 'i');
    return catalog.columns.some((column) => re.test(column));
  }
  return catalog.presentKeys.includes(requirement);
}

/**
 * Het bewijs van een vraag, altijd als groepen.
 *
 * Een vraag uit de bank draagt zijn twee lagen zelf: attributen met per attribuut
 * de velden die het kunnen dragen. Een vraag die de merchant zelf toevoegde heeft
 * die lagen niet; die wordt één groep met zijn eigen modus.
 */
function evidenceGroups(question: Question): RequirementGroup[] {
  if (question.evidence && question.evidence.length > 0) return question.evidence;
  return [{
    attributeKey: question.id,
    label: question.label,
    fields: question.requires,
    mode: question.mode,
  }];
}

/** Draagt dit product het bewijs van één attribuut? */
function groupSatisfied(product: ProductRecord, group: RequirementGroup): boolean {
  // Geen enkel veld kan dit attribuut dragen: de vraag is per definitie niet uit
  // de catalogus te beantwoorden. Dat is de bevinding, niet een reden om over te slaan.
  if (group.fields.length === 0) return false;
  return group.mode === 'any'
    ? group.fields.some((field) => satisfies(product, field))
    : group.fields.every((field) => satisfies(product, field));
}

function answersQuestion(product: ProductRecord, question: Question) {
  const groups = evidenceGroups(question);
  const satisfied = groups.map((group) => groupSatisfied(product, group));
  const answered = question.mode === 'any'
    ? satisfied.some(Boolean)
    : satisfied.every(Boolean);

  const fields = groups.flatMap((group) => group.fields);
  return {
    answered,
    fields,
    missing: answered ? [] : fields.filter((field) => !satisfies(product, field)),
    /** Er staat iets, maar niet genoeg: onvolledig in plaats van ontbrekend. */
    partial: !answered && fields.some((field) => satisfies(product, field)),
    /** Gevuld maar te mager om een antwoord te heten. */
    weak: !answered && fields.some((field) => fieldState(product, field) === 'weak'),
  };
}

/**
 * De vijf toestanden, in volgorde van handelingsperspectief.
 *
 * Onbruikbaar en onvolledig gaan vóór leeg: als er iets staat, is herschrijven of
 * aanvullen de kortste weg. Leeg gaat vóór ontbreekt, want een bestaand veld
 * vullen is iets anders dan er eerst een verzinnen.
 */
function answerState(
  feed: { answered: boolean; partial: boolean; weak: boolean; fields: string[] },
  catalog: Dataset,
): AnswerState {
  if (feed.answered) return 'answered';
  if (feed.weak) return 'unusable';
  if (feed.partial) return 'incomplete';
  // Kent de catalogus minstens één van de velden die deze vraag kunnen dragen,
  // dan bestaat de plek al en is dit invulwerk.
  if (feed.fields.some((field) => catalogKnows(catalog, field))) return 'empty';
  return 'absent';
}

/**
 * Kies de vragenset bij de eigen categorie van het product.
 *
 * De generator groepeert op hoofdcategorie — het eerste segment van het pad —
 * dus daar matchen we ook op. Anders valt "Fietsbanden > Racefiets" buiten de
 * set die juist voor Fietsbanden is gemaakt.
 */
export function pickSet(product: ProductRecord, sets: QuestionSet[]): QuestionSet | undefined {
  const category = mainCategory(product);
  if (!category) return undefined; // geen categorie -> geflagd en geteld, niet gescoord

  for (const set of sets) {
    if (!set.match) continue;
    if (new RegExp(set.match, 'i').test(category)) return set;
  }
  return sets.find((s) => !s.match); // de vangnet-set voor de kleine categorieën
}

/**
 * Waar komt dit gat vandaan, en dus wat voor werk is het?
 *
 * "Ontbreekt" is geen werkopdracht. Deze drie zijn dat wel, en ze horen bij een
 * andere persoon en een ander budget: een leeg veld vult iemand deze week, een
 * ontbrekend veld vraagt eerst een beslissing over het datamodel, en een gegeven
 * dat uit het reviewplatform moet komen vraagt een koppeling die er niet is.
 */
export function classifyGap(key: string, catalog: Dataset): GapCause {
  const owner = FIELD_BY_KEY[key]?.owner;
  // Reviews en retouren komen uit systemen die een productcatalogus niet draagt.
  // Dat is geen tekortkoming van het PIM en hoort er ook niet als zodanig te staan.
  if (owner === 'reviews' || owner === 'returns') return 'no-source';
  return catalogKnows(catalog, key) ? 'unfilled' : 'unmodelled';
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

function gapFor(key: string, questionId: string, catalog: Dataset): Gap {
  const def = FIELD_BY_KEY[key];
  const readable = key.startsWith('attr:') ? readableField(key) : key;
  return {
    field: key,
    label: def?.label ?? { nl: readable, en: readable },
    cause: classifyGap(key, catalog),
    owner: def?.owner ?? 'pim',
    affected: 1,
    questions: [questionId],
  };
}

export function evaluateProduct(
  product: ProductRecord,
  sets: QuestionSet[],
  catalog: Dataset,
): ProductResult {
  const set = pickSet(product, sets);
  const questions: QuestionOutcome[] = [];
  const gaps = new Map<string, Gap>();

  if (set) {
    for (const question of set.questions) {
      if (question.disabled) continue;
      const outcome = answersQuestion(product, question);
      const state = answerState(outcome, catalog);
      questions.push({
        questionId: question.id,
        label: question.label,
        state,
        answered: state === 'answered',
        missing: outcome.missing,
        weight: weightOf(question),
        scored: isScored(question),
        importance: question.importance ?? CUSTOM_IMPORTANCE,
      });

      // Een gat bestaat alleen als er een vraag door onbeantwoord blijft. Een veld
      // dat niemand nodig heeft is geen gat, en dat is het hele verschil met een
      // compleetheidscontrole.
      if (state === 'answered' || !isScored(question)) continue;
      for (const key of outcome.missing) {
        const existing = gaps.get(key);
        if (existing) existing.questions.push(question.id);
        else gaps.set(key, gapFor(key, question.id, catalog));
      }
    }
  }

  // De trechter loopt over de gescoorde vragen. Een procesvraag als "kan ik een
  // staal krijgen" hoort in het advies en niet in de meting: geen enkel attribuut
  // kan hem dragen, dus meetellen zou elke merchant op hetzelfde punt laten zakken.
  const scored = questions.filter((q) => q.scored);
  const critical = scored.filter((q) => q.importance === 'critical');

  return {
    key: product.key,
    title: str(product.values.title),
    image: str(product.values.image),
    category: mainCategory(product),
    setId: set?.id,
    unmatched: set === undefined,
    findable: set !== undefined && scored.length > 0 && scored.every((q) => q.answered),
    // Kent een set geen kritieke vragen, dan is deze trede leeg en zegt het
    // rapport dat erbij; hem stilzwijgend op waar zetten zou een poort
    // suggereren die er niet is.
    qualified: set !== undefined && scored.length > 0 && critical.every((q) => q.answered),
    weight: scored.reduce((sum, q) => sum + q.weight, 0),
    earned: scored.reduce((sum, q) => sum + (q.answered ? q.weight : 0), 0),
    questions,
    gaps: [...gaps.values()],
  };
}
