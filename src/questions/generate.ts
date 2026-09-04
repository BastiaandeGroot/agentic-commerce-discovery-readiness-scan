// Generatie van vragensets — de stap die pas kan lopen nadat de merchant zijn
// data heeft aangeleverd.
//
// De sets gaan over de EIGEN categorieen van de merchant, anders meten we onze
// indeling in plaats van de zijne. De vragen komen daarentegen nooit uit zijn
// data: die komen uit een vragenbank die op vertical-niveau is opgebouwd (zie
// `bank.ts`). Dat onderscheid is dragend. Zou de bank uit zijn kolommen volgen,
// dan meten we of zijn feed zijn eigen velden draagt — en dat is per definitie
// waar.
//
// Dus:
//   1. haal de echte categorieen uit de feed of de catalogus;
//   2. kies per categorie de bank die op die markt slaat;
//   3. leg de categorie-overlay op de basislaag;
//   4. leg het voor aan de merchant, die mag bewerken, uitzetten en aanvullen.
//
// Stap 4 is geen formaliteit. Een samengestelde set is een hypothese; zonder
// validatielus is de eerste aanwijzing dat een set fout was een klacht (S6).
//
// De generator is deterministisch en blijft dat. De vragen worden beantwoord uit
// gestructureerde attributen, niet uit lopende tekst, en er komt geen model aan
// te pas — de uitkomst is daarmee reproduceerbaar en kost niets per scan.

import type { Dataset, Question, QuestionSet, QuestionSetState } from '../domain/types';
import type { QuestionBank } from './bank';
import { bankFor, resolveBanks } from './banks';
import { composeSet } from './compose';
import { str } from '../intake/normalize';
import { mainCategory } from '../engine/join';

/** Hoeveel categorieen een eigen set krijgen; de staart wordt samengevoegd. */
const MAX_SETS = 30;

export interface CategoryStat {
  name: string;
  count: number;
}

/**
 * Tel de categorieen, aflopend op aantal producten.
 *
 * De boom komt uit de catalogus, zoals de merchant hem onderhoudt. Dat is precies
 * waarom de catalogus de bron is en niet een kanaalfeed: die vlakt de boom af.
 * Bij de testmerchant werd "Outdoorstoffen > Gestreept" onderweg tot los
 * "Gestreept" en verdween een hele hoofdcategorie.
 */
export function deriveCategories(catalog: Dataset): CategoryStat[] {
  const counts = new Map<string, number>();
  for (const product of catalog.products) {
    const category = mainCategory(product);
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Verkoopt deze merchant ook gebruikte of gerefurbishte producten?
 *
 * De vraag "is het nieuw of gebruikt?" is zinloos in een catalogus waar alles
 * nieuw is: hij staat gegarandeerd onbeantwoord zodra het veld leeg is, en
 * beantwoord zodra het gevuld is, zonder dat een koper er ooit naar vroeg.
 *
 * De specificatie helpt hier: condition staat standaard op "new". Ontbreekt het
 * veld overal, dan is dat geen gat maar de standaardwaarde. Pas als er ergens
 * iets anders dan nieuw in staat, wordt het een echte keuze voor de koper.
 */
function sellsNonNew(catalog: Dataset): boolean {
  return catalog.products.some((product) => {
    const value = str(product.values.condition)?.toLowerCase();
    return value !== undefined && value !== 'new' && value !== 'nieuw';
  });
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'categorie';
}

/**
 * Bouw de vragensets voor deze merchant. Levert versie 1 met een lege changelog;
 * elke bewerking daarna verhoogt de versie en schrijft een regel bij (S8).
 *
 * `imported` zijn de banken die uit de methode terugkwamen. Staat er een die op
 * de categorie matcht, dan wint die van de meegeleverde terugval.
 */
export function generateQuestionSets(
  catalog: Dataset,
  imported: QuestionBank[] = [],
): QuestionSetState {
  const banks = resolveBanks(imported);
  const categories = deriveCategories(catalog);
  // Vragen die in deze catalogus niets te vragen hebben, laten we weg in plaats
  // van ze als permanent gat te laten staan.
  const askCondition = sellsNonNew(catalog);
  const applicable = (question: Question) =>
    askCondition || !question.requires.includes('condition');

  const named = categories.slice(0, MAX_SETS);
  const tail = categories.slice(MAX_SETS);
  const used = new Map<string, QuestionBank>();

  const sets: QuestionSet[] = named.map((category) => {
    const bank = bankFor(category.name, banks);
    used.set(bank.meta.vertical, bank);
    const set = composeSet(bank, { id: slug(category.name), name: category.name, count: category.count });
    return { ...set, questions: set.questions.filter(applicable) };
  });

  // De staart van kleine categorieen deelt een vangnet-set, zodat die producten
  // wel gescoord worden maar de lijst hanteerbaar blijft.
  if (tail.length > 0) {
    const fallback = banks.find((bank) => !bank.meta.match) ?? banks[banks.length - 1];
    used.set(fallback.meta.vertical, fallback);
    const set = composeSet(fallback, {
      id: 'overige-categorieen',
      name: 'Overige categorieën',
      count: tail.reduce((sum, c) => sum + c.count, 0),
    });
    sets.push({
      ...set,
      label: {
        nl: `Overige categorieën (${tail.length})`,
        en: `Remaining categories (${tail.length})`,
      },
      // Geen match: dit is de set waar alles in valt wat nergens anders op uitkomt.
      match: undefined,
      category: undefined,
      questions: set.questions.filter(applicable),
    });
  }

  return {
    version: 1,
    sets,
    changeLog: [],
    // De herkomst reist mee tot op het rapport: een cijfer dat beweegt omdat de
    // bank onder de merchant vernieuwd is, mag niet op vooruitgang lijken.
    banks: [...used.values()].map((bank) => ({
      id: bank.meta.vertical,
      label: bank.meta.label,
      version: bank.meta.version,
      status: bank.meta.status,
    })),
  };
}
