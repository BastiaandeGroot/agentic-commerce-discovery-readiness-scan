// Generatie van vragensets — de stap die pas kan lopen nadat de merchant zijn
// data heeft aangeleverd.
//
// De sets moeten over de EIGEN categorieen van de merchant gaan, anders meten we
// onze indeling in plaats van de zijne. Daarom:
//
//   1. haal de echte categorieen uit de feed;
//   2. koppel per categorie een archetype (of het vangnet);
//   3. vul aan met vragen die uit de data zelf komen — kolommen die in deze
//      categorie steeds terugkomen zijn een sterke aanwijzing voor wat er speelt;
//   4. leg het voor aan de merchant, die mag bewerken, uitzetten en aanvullen.
//
// Stap 4 is geen formaliteit. Een gegenereerde set is een hypothese; zonder
// validatielus is de eerste aanwijzing dat een set fout was een klacht (S6).
//
// De generator is bewust deterministisch. Waar de rationale een LLM voorziet,
// is dit de plek waar die binnenkomt: dezelfde in- en uitvoer, rijkere vragen.

import type { Dataset, Question, QuestionSet, QuestionSetState } from '../domain/types';
import { ARCHETYPES } from './archetypes';
import { isBlank, str } from '../intake/normalize';

/** Hoeveel categorieen een eigen set krijgen; de staart wordt samengevoegd. */
const MAX_SETS = 30;
/** Vanaf welke vulgraad een eigen kolom een kandidaatvraag wordt. */
const DERIVED_FILL_THRESHOLD = 0.4;
const MAX_DERIVED_PER_SET = 6;

/**
 * Kolommen die nooit een koperssvraag opleveren: administratie, kanaalsturing en
 * boekhouding. Een Channable-feed zit er vol mee. Zonder deze filter wordt de
 * eerste voorgestelde vraag "Wat is de custom label 0?", en dan is het scherm
 * meteen zijn geloofwaardigheid kwijt.
 */
const DERIVED_DENYLIST = [
  /custom_label/i, /^ads?_/i, /_ads?$/i, /ads_/i, /cost_of_goods/i, /auto_pricing/i,
  /identifier_exists/i, /expiration/i, /^link$/i, /_link$/i, /image/i, /^id$/i, /_id$/i,
  /shipping/i, /handling/i, /cutoff/i, /free_shipping/i, /bulk_price/i, /promotion/i,
  /^status$/i, /^visibility$/i, /created_at/i, /updated_at/i, /^type_id$/i, /manage_stock/i,
  /^qty$/i, /backorder/i, /^price/i, /_price$/i, /^min_/i, /^max_/i, /excl_/i, /incl_/i,
  /^sku$/i, /^ean$/i, /tax/i, /^url/i, /seo/i, /^supplier$/i, /is_bundle/i, /categor/i,
];

function isUsefulAttribute(column: string): boolean {
  return !DERIVED_DENYLIST.some((re) => re.test(column));
}

export interface CategoryStat {
  name: string;
  count: number;
}

/**
 * De hoofdcategorie van een product: het eerste segment van het eigen
 * categoriepad.
 *
 * De Google-productcategorie is bewust de laatste optie en alleen als hij een
 * pad is, geen ID. Een feed die daar "2669" invult geeft geen categorienaam maar
 * een verwijzing naar Googles taxonomie; daar een vragenset op bouwen levert een
 * set met de naam "2669" op, en dat is voor niemand een categorie.
 */
export function mainCategory(values: Record<string, string>): string | undefined {
  const own = str(values.product_type);
  const google = str(values.product_category);
  const raw = own ?? (google && !/^\d+$/.test(google) ? google : undefined);
  if (!raw) return undefined;
  const first = raw.split(/\s*[>/|]\s*/)[0];
  const cleaned = first.replace(/\s+/g, ' ').trim();
  if (cleaned === '' || /^\d+$/.test(cleaned)) return undefined;
  return cleaned;
}

/** Tel de categorieen in de feed, aflopend op aantal producten. */
export function deriveCategories(feed: Dataset): CategoryStat[] {
  const counts = new Map<string, number>();
  for (const product of feed.products) {
    const category = mainCategory(product.values);
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'categorie';
}

function humanise(column: string): string {
  return column
    .replace(/^\s*[a-z]+:/i, '')
    .replace(/[_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Kies het archetype dat bij deze categorienaam past. */
function archetypeFor(category: string) {
  for (const archetype of ARCHETYPES) {
    if (!archetype.match) continue;
    if (new RegExp(archetype.match, 'i').test(category)) return archetype;
  }
  return ARCHETYPES.find((a) => !a.match) ?? ARCHETYPES[0];
}

/**
 * Vragen die uit de data van de merchant zelf komen: kolommen die we niet in de
 * specificatie konden plaatsen maar die in deze categorie stelselmatig gevuld
 * zijn. Dat is het dichtste dat we deterministisch bij "wat vraagt een koper in
 * deze categorie" komen — en het maakt de gaten zichtbaar bij de producten waar
 * de merchant het attribuut juist NIET heeft ingevuld.
 */
function derivedQuestions(
  feed: Dataset,
  catalog: Dataset | undefined,
  category: string,
  covered: Set<string>,
): Question[] {
  const members = feed.products.filter((p) => mainCategory(p.values) === category);
  if (members.length < 3) return [];

  const fill = new Map<string, number>();
  for (const product of members) {
    for (const [column, value] of Object.entries(product.unmapped)) {
      if (isBlank(value) || !isUsefulAttribute(column)) continue;
      fill.set(column, (fill.get(column) ?? 0) + 1);
    }
  }

  // Ook uit de catalogus afleiden. Juist daar staan de kenmerken die de merchant
  // wél bijhoudt maar niet doorzet naar de feed — en dat is precies het
  // mappinggat dat we willen laten zien. Een kenmerk dat het PIM stelselmatig
  // vult is een sterke kandidaat voor een vraag die ertoe doet.
  if (catalog) {
    const share = new Map<string, number>();
    for (const product of catalog.products) {
      for (const [column, value] of Object.entries(product.unmapped)) {
        if (isBlank(value) || !isUsefulAttribute(column)) continue;
        share.set(column, (share.get(column) ?? 0) + 1);
      }
    }
    for (const [column, count] of share) {
      if (count / catalog.products.length < DERIVED_FILL_THRESHOLD) continue;
      // Tel mee alsof de feed hem niet heeft; dat is het punt van de vraag.
      if (!fill.has(column)) fill.set(column, Math.round(members.length * 0.999));
    }
  }

  return [...fill.entries()]
    .filter(([column, n]) => {
      if (n / members.length < DERIVED_FILL_THRESHOLD) return false;
      const human = humanise(column);
      // Niet dubbelen met een vraag die het archetype al stelt.
      return ![...covered].some((c) => c.includes(human) || human.includes(c));
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DERIVED_PER_SET)
    .map(([column], index) => {
      const human = humanise(column);
      return {
        id: `d${index + 1}`,
        origin: 'derived' as const,
        mode: 'all' as const,
        // Anker op precies deze kolom, niet op een los patroon.
        requires: [`attr:^${column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`],
        label: {
          nl: `Wat is bekend over "${human}"?`,
          en: `What is known about "${human}"?`,
        },
      };
    });
}

/**
 * Bouw de vragensets voor deze merchant. Levert versie 1 met een lege changelog;
 * elke bewerking daarna verhoogt de versie en schrijft een regel bij (S8).
 */
export function generateQuestionSets(feed: Dataset, catalog?: Dataset): QuestionSetState {
  const categories = deriveCategories(feed);
  const named = categories.slice(0, MAX_SETS);
  const tail = categories.slice(MAX_SETS);

  const sets: QuestionSet[] = named.map((category) => {
    const archetype = archetypeFor(category.name);
    const covered = new Set(
      archetype.questions.flatMap((q) => [q.label.nl.toLowerCase(), ...q.requires.map(humanise)]),
    );
    const questions: Question[] = [
      ...archetype.questions.map((q) => ({ ...q, origin: 'archetype' as const })),
      ...derivedQuestions(feed, catalog, category.name, covered),
    ];

    return {
      id: slug(category.name),
      label: { nl: category.name, en: category.name },
      // Anker de match op de exacte categorienaam van de merchant.
      match: `^${category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      category: category.name,
      productCount: category.count,
      archetypeId: archetype.id,
      questions,
      validated: false,
    };
  });

  // De staart van kleine categorieen deelt een vangnet-set, zodat die producten
  // wel gescoord worden maar de lijst hanteerbaar blijft.
  if (tail.length > 0) {
    const fallback = ARCHETYPES.find((a) => !a.match) ?? ARCHETYPES[0];
    sets.push({
      id: 'overige-categorieen',
      label: {
        nl: `Overige categorieën (${tail.length})`,
        en: `Remaining categories (${tail.length})`,
      },
      category: undefined,
      productCount: tail.reduce((sum, c) => sum + c.count, 0),
      archetypeId: fallback.id,
      questions: fallback.questions.map((q) => ({ ...q, origin: 'archetype' as const })),
      validated: false,
    });
  }

  return { version: 1, sets, changeLog: [] };
}
