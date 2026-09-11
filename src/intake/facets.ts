// Welk categoriepad is een categorie, en welk is eigenlijk een eigenschap?
//
// Fase 4 van de methode: loop de boom langs en markeer elk pad dat eigenlijk een
// filter is — Vlekwerend, Gestreept, Effen, Duurzaam. Die horen geen vragenset
// te krijgen maar een attribuutwaarde te zijn.
//
// Dit is geen kosmetiek. Een vragenset per facet betekent dat "Gestreept" de
// vragen over naaigaren of gordijnen krijgt, en dan meet de scan iets anders dan
// er verkocht wordt. Het aantal facetcategorieën is bovendien zelf een
// meetwaarde, vergelijkbaar over merchants heen: hoe meer categorieën die
// eigenlijk een filter zijn, hoe groter de onderliggende attribuutschuld.
//
// Puur: geen fetch, geen DOM, geen klok. Wat de website erover zegt komt binnen
// als argument, want ophalen hoort in een serverroute.

/** Eén pad uit de catalogus, van hoofdcategorie naar blad. */
export interface CategoryPath {
  segments: string[];
  productCount: number;
}

/**
 * Wat de website van dit pad vindt.
 *
 * Twee lijsten en geen boolean, omdat "staat in het menu" en "staat in het
 * filterpaneel" allebei bewijs zijn en het ontbreken van allebei iets anders
 * betekent dan tegenspraak. Namen zoals ze op de site staan; het vergelijken
 * gebeurt hieronder genormaliseerd.
 */
export interface SiteEvidence {
  /** Namen die in de navigatie staan: de merchant noemt dit een categorie. */
  navigation: string[];
  /** Namen die in een filterpaneel staan, of achter een filter-URL zitten. */
  filters: string[];
}

export type PathKind = 'category' | 'facet' | 'unclear';

/**
 * Waaróm, als code en niet als zin.
 *
 * De tekst hoort in `src/i18n/`, in beide talen. Een zin hier zou de motor
 * eentalig maken en zou hem bovendien laten bepalen hoe iets aan een merchant
 * uitgelegd wordt — dat is een keuze van het scherm.
 */
export type PathReason =
  | 'in-filters'
  | 'in-both'
  | 'many-parents'
  | 'top-level'
  | 'in-nav-only'
  | 'not-on-site'
  | 'no-site'
  | 'model'
  | 'merchant';

export interface ClassifiedPath {
  segments: string[];
  productCount: number;
  kind: PathKind;
  /** Waarop het oordeel steunt, zodat een merchant het kan tegenspreken. */
  reason: PathReason;
}

/** Namen vergelijkbaar maken: hoofdletters, accenten en tekens weg. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Het signaal dat geen website nodig heeft: dezelfde naam onder meer dan één
 * ouder.
 *
 * Een echte subcategorie hoort bij één plek in de boom — "Meubelstoffen" hangt
 * onder stoffen en nergens anders. Een eigenschap hangt overal: "Gestreept"
 * staat onder outdoor, onder gordijn én onder decoratie, want het is een
 * kenmerk van het product en geen soort product. Dat onderscheid is
 * deterministisch te zien en het werkt in elke markt, zonder woordenlijst.
 *
 * Vandaar de drempel van twee: één keer voorkomen zegt niets, twee keer onder
 * verschillende ouders is al een patroon dat een categorie zelden vertoont.
 */
const MIN_PARENTS_FOR_FACET = 2;

export function classifyPaths(
  paths: CategoryPath[],
  site?: SiteEvidence,
): ClassifiedPath[] {
  // Per bladnaam: onder welke ouders komt hij voor?
  const parentsByLeaf = new Map<string, Set<string>>();
  for (const path of paths) {
    if (path.segments.length < 2) continue;
    const leaf = normalizeName(path.segments[path.segments.length - 1]);
    const parent = normalizeName(path.segments[path.segments.length - 2]);
    const set = parentsByLeaf.get(leaf) ?? new Set<string>();
    set.add(parent);
    parentsByLeaf.set(leaf, set);
  }

  const inNav = new Set((site?.navigation ?? []).map(normalizeName));
  const inFilters = new Set((site?.filters ?? []).map(normalizeName));

  return paths.map((path) => {
    const key = normalizeName(path.segments[path.segments.length - 1]);
    const parents = parentsByLeaf.get(key)?.size ?? 0;

    // Het filterpaneel wint van het menu, ook als de naam in allebei staat.
    //
    // Gemeten op de site van de testmerchant, en dat gaf de doorslag: "Vlekwerend"
    // en "Gedessineerd" staan op dezelfde pagina én tussen de filters én tussen
    // de categorieën. Dat is geen tegenspraak maar de bevinding zelf — een
    // eigenschap die in de categorieboom belandde omdat er geen attribuut voor
    // was. Zou dit `unclear` blijven, dan verdween precies het geval waar het om
    // gaat in de twijfelhoek.
    //
    // Het menu alleen is te zwak gebleken: dezelfde merchant zet "Effen",
    // "Premium" en "Gedessineerd" gewoon in zijn hoofdmenu naast "Banken".
    if (inFilters.has(key)) {
      return { ...path, kind: 'facet' as const, reason: inNav.has(key) ? 'in-both' : 'in-filters' };
    }
    // Staan in het menu maakt iets géén categorie.
    //
    // Dat leek de voor de hand liggende regel en hij is op de eerste echte site
    // gesneuveld: die zet "Effen", "Premium" en "Gedessineerd" gewoon naast
    // "Banken" in het hoofdmenu. Een menu is een verkoopinstrument, geen
    // datamodel. Het blijft wel het verschil tussen "we hebben gekeken en het
    // staat er niet" en "we hebben niet gekeken", en dat verschil staat in de
    // reden zodat een merchant weet wat hij bevestigt.
    if (parents >= MIN_PARENTS_FOR_FACET) {
      return { ...path, kind: 'facet' as const, reason: 'many-parents' };
    }
    if (path.segments.length === 1) {
      return { ...path, kind: 'category' as const, reason: 'top-level' };
    }
    return { ...path, kind: 'unclear' as const,
      reason: site ? (inNav.has(key) ? 'in-nav-only' : 'not-on-site') : 'no-site' };
  });
}

/** De marktsegmenten waarvoor een vragenset gemaakt moet worden. */
export function segmentsToResearch(classified: ClassifiedPath[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of classified) {
    if (path.kind === 'facet') continue;
    // Het segment is de hoofdcategorie: daar hangt de vragenset aan. Een
    // subcategorie krijgt er alleen een eigen als de vragenlijst een ándere set
    // voor haar kent, en dat weet de lijst — niet deze functie.
    const head = path.segments[0];
    const key = normalizeName(head);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(head);
  }
  return out;
}

/**
 * Eén ruwe categoriewaarde uit een export uit elkaar halen.
 *
 * Twee soorten scheidingsteken die niet hetzelfde betekenen, en dat verschil is
 * hier de hele truc:
 *
 *   - `|` (en een nieuwe regel) scheidt **categorieën**. Een product hangt in
 *     meer dan één, en een export zet die achter elkaar.
 *   - `>` en `/` scheiden **niveaus** binnen één categorie.
 *
 * Gaat dat door elkaar, dan wordt "Meubelstoffen | Meubelstoffen/Banken" één
 * categorienaam ter lengte van een alinea — precies wat er misging toen dit
 * scherm de eerste keer op echte data draaide. De motor mag ze wél op één hoop
 * gooien: `mainCategory` wil alleen het eerste stuk. Hier telt elk lidmaatschap.
 *
 * Segmenten die alleen uit cijfers bestaan vallen weg. Een export die een
 * categorie-id als naam meelevert, levert anders een vragenset "235" op.
 */
export function splitMemberships(raw: string): string[][] {
  // WooCommerce scheidt categorieën met een komma: "Kleding > Shirts, Kleding >
  // Truien". Alleen als er geen ander scheidingsteken is én er een pad in staat,
  // want een komma in een gewone naam ("Tafels, stoelen") is geen tweede
  // categorie.
  const separator = !/[|\n;]/.test(raw) && /[>/›»]/.test(raw) && /,\s/.test(raw)
    ? /\s*,\s+/
    : /\s*[|\n;]\s*/;
  return raw
    .split(separator)
    .map((one) => one.trim())
    .filter((one) => one !== '')
    .map((one) => one
      .split(/\s*[>/›»]\s*/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter((part) => part !== '' && !/^\d+$/.test(part)))
    .filter((segments) => segments.length > 0);
}

/**
 * De categoriepaden van een catalogus, met hoeveel producten er per pad in
 * vallen.
 *
 * Het volledige pad en niet alleen het eerste segment: de vraag hier is juist
 * of `Outdoorstoffen > Gestreept` een soort product is of een eigenschap, en
 * dat verschil zit in het laatste stuk.
 */
export function pathsFromProducts(
  products: { unmapped: Record<string, unknown>; values: Record<string, unknown> }[],
  /** Het pad van één product; de motor kent die functie al. */
  pathOf: (product: never) => string | undefined,
): CategoryPath[] {
  const counts = new Map<string, string[]>();
  for (const product of products) {
    const raw = pathOf(product as never);
    if (!raw) continue;
    // Eén product hangt vaak in meerdere categorieën; elk lidmaatschap telt voor
    // zijn eigen pad. Dubbele binnen één product tellen één keer.
    const seen = new Set<string>();
    for (const segments of splitMemberships(raw)) {
      const key = segments.join(' > ');
      if (seen.has(key)) continue;
      seen.add(key);
      if (!counts.has(key)) counts.set(key, segments);
    }
  }

  const totals = new Map<string, number>();
  for (const product of products) {
    const raw = pathOf(product as never);
    if (!raw) continue;
    const seen = new Set<string>();
    for (const segments of splitMemberships(raw)) {
      const key = segments.join(' > ');
      if (seen.has(key)) continue;
      seen.add(key);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
  }

  const out: CategoryPath[] = [];
  counts.forEach((segments, key) => out.push({ segments, productCount: totals.get(key) ?? 0 }));
  return out.sort((a, b) => b.productCount - a.productCount);
}

/**
 * Wat de merchant over een pad besliste, sterker dan elk signaal.
 *
 * Sleutel is het genormaliseerde pad. Hij weet wat hij verkoopt; wij leiden af.
 */
export type Verdicts = Record<string, PathKind>;

export function pathKey(segments: string[]): string {
  return segments.map(normalizeName).join(' > ');
}

/**
 * Een voorstel van het model erover leggen.
 *
 * Alleen waar de app het zelf niet weet. Hard bewijs wint: staat "Vlekwerend" in
 * het filterpaneel van de site, dan is dat een feit en hoeft er niets voorgesteld
 * te worden. Dat is goedkoper — het model krijgt alleen de twijfelgevallen — en
 * het houdt zichtbaar wat gemeten is en wat geraden.
 */
export function applyProposals(rows: ClassifiedPath[], proposals: Verdicts): ClassifiedPath[] {
  return rows.map((row) => {
    if (row.kind !== 'unclear') return row;
    const proposed = proposals[pathKey(row.segments)];
    if (!proposed || proposed === 'unclear') return row;
    return { ...row, kind: proposed, reason: 'model' as const };
  });
}

/** Het oordeel van de merchant erover leggen. */
export function applyVerdicts(rows: ClassifiedPath[], verdicts: Verdicts): ClassifiedPath[] {
  return rows.map((row) => {
    const own = verdicts[pathKey(row.segments)];
    if (!own || own === row.kind) return row;
    return { ...row, kind: own, reason: 'merchant' as const };
  });
}

/**
 * Hoeveel van de boom is eigenlijk een filter?
 *
 * Over merchants heen vergelijkbaar, en daarom een bevinding op zichzelf: bij
 * De Groot waren het 22 van de 58 paden. Elk facetpad is een attribuut dat de
 * catalogus niet vastlegt maar de winkel wel nodig heeft.
 */
export function facetDebt(classified: ClassifiedPath[]): {
  facets: number; categories: number; unclear: number; share: number;
} {
  const facets = classified.filter((p) => p.kind === 'facet').length;
  const categories = classified.filter((p) => p.kind === 'category').length;
  const unclear = classified.filter((p) => p.kind === 'unclear').length;
  const total = classified.length;
  return { facets, categories, unclear, share: total === 0 ? 0 : facets / total };
}
