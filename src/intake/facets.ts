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

export interface ClassifiedPath {
  segments: string[];
  productCount: number;
  kind: PathKind;
  /** Waarom, in één zin, zodat een merchant het kan tegenspreken. */
  reason: string;
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
    const leaf = path.segments[path.segments.length - 1];
    const key = normalizeName(leaf);
    const parents = parentsByLeaf.get(key)?.size ?? 0;

    // Volgorde is bewust: de site wint van de structuur, want de merchant weet
    // zelf het beste wat hij als categorie verkoopt. Maar staat hij in allebei,
    // dan is dat tegenspraak en geen uitspraak.
    if (inNav.has(key) && inFilters.has(key)) {
      return { ...path, kind: 'unclear' as const,
        reason: `"${leaf}" staat op de site zowel in het menu als tussen de filters.` };
    }
    if (inFilters.has(key)) {
      return { ...path, kind: 'facet' as const,
        reason: `"${leaf}" is op de site een filter, geen categorie.` };
    }
    if (inNav.has(key)) {
      return { ...path, kind: 'category' as const,
        reason: `"${leaf}" staat in de navigatie van de site.` };
    }
    if (parents >= MIN_PARENTS_FOR_FACET) {
      return { ...path, kind: 'facet' as const,
        reason: `"${leaf}" komt onder ${parents} verschillende categorieën voor; dat is een eigenschap, geen soort product.` };
    }
    if (path.segments.length === 1) {
      return { ...path, kind: 'category' as const,
        reason: `"${leaf}" is een hoofdcategorie.` };
    }
    return { ...path, kind: 'unclear' as const,
      reason: site
        ? `"${leaf}" staat niet op de site en komt maar op één plek in de boom voor.`
        : `"${leaf}" komt maar op één plek voor; zonder de site is niet te zien of het een categorie is.` };
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
