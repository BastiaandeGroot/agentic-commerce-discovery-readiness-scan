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
// De generator is deterministisch en blijft dat. De vragen worden beantwoord uit
// gestructureerde attributen, niet uit lopende tekst, en er komt geen model aan
// te pas — de uitkomst is daarmee reproduceerbaar en kost niets per scan.

import type { Dataset, Question, QuestionSet, QuestionSetState } from '../domain/types';
import { ARCHETYPES } from './archetypes';
import { str } from '../intake/normalize';

/** Hoeveel categorieen een eigen set krijgen; de staart wordt samengevoegd. */
const MAX_SETS = 30;
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

/** Kies het archetype dat bij deze categorienaam past. */
function archetypeFor(category: string) {
  for (const archetype of ARCHETYPES) {
    if (!archetype.match) continue;
    if (new RegExp(archetype.match, 'i').test(category)) return archetype;
  }
  return ARCHETYPES.find((a) => !a.match) ?? ARCHETYPES[0];
}

/**
 * Bouw de vragensets voor deze merchant. Levert versie 1 met een lege changelog;
 * elke bewerking daarna verhoogt de versie en schrijft een regel bij (S8).
 */
export function generateQuestionSets(feed: Dataset): QuestionSetState {
  const categories = deriveCategories(feed);
  const named = categories.slice(0, MAX_SETS);
  const tail = categories.slice(MAX_SETS);

  const sets: QuestionSet[] = named.map((category) => {
    const archetype = archetypeFor(category.name);
    const questions: Question[] = archetype.questions.map((q) => ({
      ...q,
      origin: 'archetype' as const,
    }));

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
