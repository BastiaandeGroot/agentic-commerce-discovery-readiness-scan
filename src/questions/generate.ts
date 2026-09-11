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

import type { Bilingual, Dataset, Question, QuestionSet, QuestionSetState } from '../domain/types';
import type { AttributeDef, QuestionBank } from './bank';
import { bankFor, resolveBanks } from './banks';
import { composeSet, ownOverlayFor } from './compose';
import { str } from '../intake/normalize';
import { categoryMemberships, expandFacets, segmentAt, segmentLevel, withoutFacets } from '../engine/join';
import { normalizeName } from '../intake/facets';
import { catalogKnows } from '../engine/evaluate';
import { matchAttributes, type AttributeMatch } from '../spec/match';
import { applyMapping, requirementFor, type Mapping } from './mapping';

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
 *
 * Een product telt mee in élke categorie waar het hangt. Een stof die als
 * meubelstof én als gordijnstof verkocht wordt, hoort bij allebei; alleen de
 * eerste tellen maakte de kleinste markt stelselmatig te klein — en welke de
 * eerste was, besliste het alfabet.
 */
export function deriveCategories(
  catalog: Dataset,
  segments: string[] = [],
  /** Paden die een kenmerk zijn; zie `expandFacets`. */
  facets: ReadonlySet<string> = new Set(),
  level = segmentLevel(catalog.products, segments),
): CategoryStat[] {
  const counts = new Map<string, number>();
  for (const product of catalog.products) {
    const seen = new Set<string>();
    for (const path of withoutFacets(categoryMemberships(product), facets)) {
      const name = segmentAt(path, level);
      if (seen.has(name)) continue;
      seen.add(name);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Een subcategorie waar de vragenlijst een eigen vragenset voor kent. */
interface Subcategory { name: string; parent: string; count: number }

/**
 * De subcategorieën met een eigen vragenset in de lijst.
 *
 * Alleen die: een subcategorie zonder eigen vragen is dezelfde meting op minder
 * producten. En alleen op de volle naam — "Kussenpanelen" is geen "Paneel", en
 * een halve match zou een product de vragen van een andere categorie geven.
 */
function deriveSubcategories(
  catalog: Dataset,
  banks: QuestionBank[],
  facets: ReadonlySet<string>,
  level: number,
): Subcategory[] {
  const counts = new Map<string, { name: string; count: number; parents: Map<string, number> }>();
  for (const product of catalog.products) {
    const seen = new Set<string>();
    for (const path of withoutFacets(categoryMemberships(product), facets)) {
      const top = Math.min(level, path.length - 1);
      const parent = path[top];
      const bank = bankFor(parent, banks);
      for (let depth = top + 1; depth < path.length; depth++) {
        const name = path[depth];
        if (!ownOverlayFor(bank, name)) continue;
        const key = normalizeName(name);
        const entry = counts.get(key) ?? { name, count: 0, parents: new Map<string, number>() };
        if (!seen.has(key)) { entry.count += 1; seen.add(key); }
        entry.parents.set(parent, (entry.parents.get(parent) ?? 0) + 1);
        counts.set(key, entry);
      }
    }
  }
  return [...counts.values()]
    .map((entry) => ({
      name: entry.name,
      // Hangt dezelfde naam onder twee takken, dan de tak waar hij het vaakst
      // hangt. Dezelfde naam met dezelfde vragen is één set, niet twee.
      parent: [...entry.parents.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      count: entry.count,
    }))
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
 * Leg de attributen van een bank op de kolommen van déze catalogus.
 *
 * De bank noemt een kenmerk zoals het vak het noemt en de export zoals het
 * systeem het opsloeg. Zolang die twee niet op elkaar liggen leest een volle
 * catalogus als een lege, en dat is de verkeerde conclusie — niet een strenge
 * meting maar een kapotte.
 *
 * De gevonden kolommen komen erbij en niet ervoor in de plaats: een expliciete
 * `velden:`-koppeling uit de bank blijft leidend, en de modus van een attribuut
 * is `any`, dus één van de kolommen volstaat. Attributen die al ergens op
 * uitkomen worden met rust gelaten — daar valt niets te verbeteren en wel iets
 * te verpesten.
 */
function mapToCatalog(bank: QuestionBank, catalog: Dataset): {
  bank: QuestionBank; matches: AttributeMatch[];
} {
  const all = [bank.attributes, ...bank.overlays.map((overlay) => overlay.attributes ?? [])];
  const open = all.flat().filter(
    (attribute) => !attribute.evidence.some((field) => catalogKnows(catalog, field)),
  );
  if (open.length === 0) return { bank, matches: [] };

  const matches = matchAttributes(
    open.map((attribute) => ({ key: attribute.key, namedAs: attribute.namedAs })),
    catalog.columns,
  );
  if (matches.length === 0) return { bank, matches };

  const byKey = new Map(matches.map((match) => [match.key, match]));
  const extend = (attributes: AttributeDef[]): AttributeDef[] => attributes.map((attribute) => {
    const match = byKey.get(attribute.key);
    if (!match) return attribute;
    // Door dezelfde vertaalslag als een handmatige keuze: een kolomnaam is pas
    // bewijs zodra hij in de vorm staat waarin de motor hem terugvindt.
    const found = match.columns.map((column) => requirementFor(column, catalog));
    return { ...attribute, evidence: [...attribute.evidence, ...found], mode: 'any' as const };
  });

  return {
    matches,
    bank: {
      ...bank,
      attributes: extend(bank.attributes),
      overlays: bank.overlays.map((overlay) => (
        overlay.attributes ? { ...overlay, attributes: extend(overlay.attributes) } : overlay
      )),
    },
  };
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
  /** Wat de merchant zelf aanwees; die keuze gaat vóór de automatische match. */
  manual: Mapping = {},
  /**
   * Welke vragenset uit de lijst bij welke eigen categorie hoort.
   *
   * Sleutel is de categorienaam van de merchant, waarde het overlay-id uit zijn
   * vragenlijst, of `null` voor "alleen de basisvragen". Staat een categorie er
   * niet in, dan beslist de regex zoals altijd.
   */
  chosenOverlays: Record<string, string | null> = {},
  /**
   * Wat het categoriescherm als kenmerk liet staan, als padsleutels.
   *
   * Zo'n pad krijgt geen vragenset: "Motieven > Lente" is een eigenschap van de
   * stof en geen markt, en hem een set geven betekent dat buitenkussens de
   * algemene vragen krijgen omdat ze toevallig een motief hebben.
   */
  options: { facets?: string[] } = {},
): QuestionSetState {
  const mapped = new Map<string, AttributeMatch[]>();
  const banks = resolveBanks(imported).map((bank) => {
    const result = mapToCatalog(applyMapping(bank, manual, catalog), catalog);
    mapped.set(bank.meta.vertical, result.matches);
    return result.bank;
  });
  // De namen die de vragenlijst kent, zodat het aggregatieniveau de vrágen volgt
  // en niet de vorm van de boom. Een winkel die maar één segment verkoopt hoort
  // de vragen van dat segment te krijgen, niet die van een laag dieper.
  const segments = banks.flatMap((bank) => [
    ...bank.overlays.map((overlay) => overlay.label.nl),
    ...bank.overlays.map((overlay) => overlay.label.en),
    ...bank.overlays.map((overlay) => overlay.id),
  ]);
  const level = segmentLevel(catalog.products, segments);
  const facetPaths = expandFacets(catalog.products, options.facets ?? []);
  const facets = new Set(facetPaths);
  const categories = deriveCategories(catalog, segments, facets, level);
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
    const set = composeSet(
      bank,
      { id: slug(category.name), name: category.name, count: category.count },
      category.name in chosenOverlays ? chosenOverlays[category.name] : undefined,
    );
    return { ...set, questions: set.questions.filter(applicable) };
  });

  // Een eigen set voor elke subcategorie waar de lijst eigen vragen voor heeft:
  // lampenkapstoffen horen de lampenkapvragen te krijgen en niet de algemene
  // decoratievragen. Kiest de merchant voor zo'n subcategorie dezelfde set als
  // voor de categorie erboven, of kent de lijst er dezelfde vragen voor, dan is
  // het dezelfde meting en krijgt hij geen eigen rij.
  const taken = new Set(sets.map((set) => set.id));
  for (const sub of deriveSubcategories(catalog, banks, facets, level)) {
    const parentSet = sets.find((set) => set.category === sub.parent);
    const bank = bankFor(sub.parent, banks);
    const chosen = sub.name in chosenOverlays ? chosenOverlays[sub.name] : undefined;
    const own = chosen === undefined ? ownOverlayFor(bank, sub.name)?.id : chosen;
    if (own !== null && own === parentSet?.overlayId) continue;
    if (sets.some((set) => set.category !== undefined && normalizeName(set.category) === normalizeName(sub.name))) continue;

    let id = slug(`${sub.parent} ${sub.name}`);
    while (taken.has(id)) id = `${id}-2`;
    taken.add(id);
    used.set(bank.meta.vertical, bank);
    const set = composeSet(bank, { id, name: sub.name, count: sub.count }, own);
    sets.push({ ...set, parent: sub.parent, questions: set.questions.filter(applicable) });
  }

  // Elke subcategorie direct onder haar categorie, zodat het koppelscherm de
  // boom laat zien in plaats van een lijst waar de subcategorieën onderaan
  // bungelen.
  const mains = sets.filter((set) => !set.parent);
  const ordered = mains.flatMap((main) => [main, ...sets.filter((set) => set.parent === main.category)]);
  sets.splice(0, sets.length, ...ordered, ...sets.filter((set) => set.parent && !ordered.includes(set)));

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

  // Welke attributen slaan op geen enkele kolom? Dat is de mappinglaag, en zonder
  // dat getal leest een bank waarvan de attribuutnamen niet op de kolomnamen
  // aansluiten als een lege catalogus.
  const blind = new Map<string, { key: string; label: Bilingual }>();
  for (const set of sets) {
    for (const question of set.questions) {
      for (const group of question.evidence ?? []) {
        if (group.fields.some((field) => catalogKnows(catalog, field))) continue;
        blind.set(group.attributeKey, { key: group.attributeKey, label: group.label });
      }
    }
  }

  return {
    version: 1,
    sets,
    changeLog: [],
    facetPaths: facetPaths.length > 0 ? facetPaths : undefined,
    segmentLevel: level,
    blindAttributes: [...blind.values()],
    // Wat de koppeling wél opleverde. Dit is een gok van de app en geen uitspraak
    // van de merchant, dus het hoort controleerbaar in beeld: een verkeerd
    // gekoppelde kolom laat een gat verdwijnen dat er wel degelijk is.
    attributeMatches: [...used.keys()].flatMap((vertical) => mapped.get(vertical) ?? []),
    // Categorieën waar wél een bank met overlays op uitkwam, maar geen overlay
    // op aansloeg. Dan draagt de set alleen de basislaag, en dat is een stille
    // halvering: de categoriespecifieke vragen zijn juist de vragen waar de
    // onomkeerbare fout in zit.
    // Welke vragensets de lijst kent, zodat de merchant er zelf een kan
    // aanwijzen als de namen niet op zijn boom uitkomen.
    overlays: [...used.values()].flatMap((bank) =>
      bank.overlays.map((overlay) => ({ id: overlay.id, label: overlay.label }))),
    categoriesWithoutOverlay: sets
      .filter((set) => set.category !== undefined && set.overlayId === undefined
        && (used.get(set.bankId ?? '')?.overlays.length ?? 0) > 0)
      .map((set) => set.category as string),
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
