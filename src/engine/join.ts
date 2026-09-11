// Welke categorie is leidend voor een product?
//
// De categorie bepaalt welke vragenset erop wordt losgelaten, en daarmee waar de
// merchant op afgerekend wordt. Een product dat op "simple" of op "2669" uitkomt
// krijgt een vragenset die niet over zijn markt gaat, en dat is erger dan geen
// vragenset — vandaar de uitsluitingen hieronder.
//
// Een product hangt bovendien zelden op één plek. Een stof die als meubelstof
// én als gordijnstof verkocht wordt, staat in beide takken, en een agent die hem
// voor een bank aanraadt moet de meubelstofvragen kunnen beantwoorden. Dit
// bestand leest daarom álle plekken waar een product hangt, en niet de eerste —
// de eerste was bij de testwinkel de eerste op alfabet, en daarmee werden 1.371
// stoffen als decoratiestof gemeten omdat de D vóór de G komt.

import type { ProductRecord, QuestionSet } from '../domain/types';
import { str } from '../intake/normalize';
import { normalizeName, pathKey, splitMemberships } from '../intake/facets';

// --- Categorie -------------------------------------------------------------

/** Kolomnamen die een eigen categoriepad kunnen dragen. */
const CATEGORY_COLUMN = /categor(y|ie)/i;

/**
 * Naburige kolommen die wél "categor" in de naam hebben maar geen naam dragen:
 * main_category.id, .level, .url. Zonder deze uitsluiting krijgt een merchant
 * een vragenset die "85" heet.
 */
const NOT_A_NAME = /(^|[._])(id|ids|level|depth|url|link|slug|count)$/i;

/**
 * Magento's product_type zegt "simple" of "configurable" — dat is de soort
 * record, niet de categorie. Zonder deze uitsluiting krijgt een merchant een
 * vragenset met de naam "simple".
 */
const RECORD_TYPES = /^(simple|configurable|bundle|grouped|virtual|downloadable)$/i;

/** De kolommen met een categorienaam, de hoofdcategorie voorop. */
function categoryValues(record: ProductRecord): string[] {
  const columns = Object.entries(record.unmapped).filter(([column, value]) => {
    if (!CATEGORY_COLUMN.test(column) || NOT_A_NAME.test(column)) return false;
    const v = str(value);
    return v !== undefined && !/^\d+$/.test(v) && !/^https?:/i.test(v);
  });

  // De hoofdcategorie gaat voor. Een PIM levert vaak ook een lijst met álle
  // categorieen waar een product in hangt; die komt erachter.
  const primary = columns.filter(([column]) => /main|primary|hoofd/i.test(column));
  const rest = columns.filter(([column]) => !/main|primary|hoofd/i.test(column));
  const values = [...primary, ...rest].map(([, value]) => String(value).trim());
  if (values.length > 0) return values;

  const own = str(record.values.product_type);
  if (own && !RECORD_TYPES.test(own)) return [own];

  // De Google-productcategorie is de laatste optie, en alleen als hij een pad is.
  // Een feed die daar "2669" invult geeft een verwijzing naar Googles taxonomie,
  // geen categorienaam; daar een vragenset op bouwen levert een set "2669" op.
  const google = str(record.values.product_category);
  return google && !/^\d+$/.test(google) ? [google] : [];
}

/** Het categoriepad van één record, uit de best beschikbare kolom. */
export function categoryPath(record: ProductRecord): string | undefined {
  return categoryValues(record)[0];
}

/**
 * Alle plekken waar een product hangt, elk als pad van hoofdcategorie naar blad.
 *
 * Uit élke categoriekolom, de hoofdcategorie voorop, zonder dubbelen. Een
 * product in "Meubelstoffen | Meubelstoffen/Banken" hangt op twee plekken, en
 * een JSON-export die de hoofdcategorie en de lijst apart levert ook.
 */
export function categoryMemberships(record: ProductRecord): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const value of categoryValues(record)) {
    for (const segments of splitMemberships(value)) {
      const key = pathKey(segments);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(segments);
    }
  }
  return out;
}

/**
 * Op welk niveau van de categorieboom de marktsegmenten zitten.
 *
 * De app nam altijd het eerste stuk van het pad, en dat gaat bij de ene winkel
 * goed en bij de andere mis. Bij een stoffenwinkel is niveau 1 al een segment
 * ("Meubelstoffen", "Gordijnstoffen"). Bij een tuinmeubelwinkel is niveau 1 de
 * hele winkel ("Tuinmeubelen") en zitten de segmenten een laag dieper.
 *
 * Gemeten gevolg van die aanname: op een tuinmeubelcatalogus kwamen alle
 * producten in één categorie en werden 35 van de 66 vragen nooit gesteld —
 * zonder dat het rapport dat ergens vermeldde.
 *
 * De regel is zo smal mogelijk gehouden: zak alleen door zolang er op dit
 * niveau precies één waarde is. Eén waarde betekent dat dit niveau niets
 * onderscheidt, en dan is het de winkel en geen segment. Zodra er twee of meer
 * zijn, onderscheidt het wél en blijven we staan. Zo verandert er niets voor een
 * catalogus waar het eerste niveau al klopt.
 */
export function segmentLevel(products: ProductRecord[], knownSegments: string[] = []): number {
  const paths = products.flatMap((product) => categoryMemberships(product));
  if (paths.length === 0) return 0;

  const known = new Set(knownSegments.map(normalize));
  const deepest = Math.max(...paths.map((parts) => parts.length));

  for (let level = 0; level < deepest - 1; level++) {
    const distinct = new Set<string>();
    for (const parts of paths) {
      const value = parts[level];
      if (value) distinct.add(value);
    }
    // Onderscheidt dit niveau iets, dan is het een segmentniveau.
    if (distinct.size > 1) return level;
    // Eén waarde, maar de vragenlijst kent er een vragenset voor: dan is het
    // wél een segment en verkoopt deze winkel er toevallig maar één. Een
    // stoffenwinkel die alleen meubelstoffen voert hoort de meubelstofvragen te
    // krijgen, niet die van een laag dieper.
    for (const value of distinct) if (known.has(normalize(value))) return level;
  }
  return Math.max(0, deepest - 1);
}

/** Namen vergelijkbaar maken zonder ze te verminken. */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
}

/** Het segment van een pad op het marktniveau, of het diepste als het pad korter is. */
export function segmentAt(segments: string[], level: number): string {
  return segments[Math.min(level, segments.length - 1)];
}

// --- Kenmerken die als categorie in de boom staan --------------------------

/**
 * De plekken van een product, zonder wat eigenlijk een kenmerk is.
 *
 * Een pad dat als kenmerk is aangemerkt — "Outdoorstoffen > Gestreept" — wordt
 * afgeknipt waar het kenmerk begint. Wat overblijft is de categorie waar het
 * onder hing, en daar hoort het product ook gemeten te worden. Blijft er niets
 * over, dan valt die plek weg.
 */
export function withoutFacets(memberships: string[][], facets: ReadonlySet<string>): string[][] {
  if (facets.size === 0) return memberships;
  const out: string[][] = [];
  const seen = new Set<string>();
  for (const segments of memberships) {
    let cut = segments.length;
    for (let index = 0; index < segments.length; index++) {
      if (facets.has(pathKey(segments.slice(0, index + 1)))) { cut = index; break; }
    }
    const kept = segments.slice(0, cut);
    const key = pathKey(kept);
    if (kept.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(kept);
  }
  return out;
}

/**
 * De kenmerken die de merchant aanwees, plus de takken die alleen uit kenmerken
 * bestaan.
 *
 * "Motieven > Lente" is een kenmerk. Afknippen laat "Motieven" staan, en dat is
 * geen markt maar een map in het menu: er hangt geen enkel product rechtstreeks
 * in, en geen enkel pad eronder is een soort product. Zo'n tak gaat er in zijn
 * geheel af. Dat is geen oordeel over de naam maar over de boom — "Outdoorstoffen
 * > Gestreept" laat "Outdoorstoffen" staan, want daar hangen buitenkussens en
 * schaduwdoek onder.
 *
 * Over de hele catalogus, en daarom één keer bij het samenstellen en niet per
 * product: of een tak nog iets draagt zie je pas als je alle producten kent.
 */
export function expandFacets(products: ProductRecord[], facetKeys: Iterable<string>): string[] {
  const facets = new Set(facetKeys);
  if (facets.size === 0) return [];

  // Wat overblijft van paden waar niets af hoefde: die dragen hun hele tak.
  const supported = new Set<string>();
  const cutRemainders = new Map<string, string[]>();
  for (const product of products) {
    for (const segments of categoryMemberships(product)) {
      let cut = segments.length;
      for (let index = 0; index < segments.length; index++) {
        if (facets.has(pathKey(segments.slice(0, index + 1)))) { cut = index; break; }
      }
      if (cut === segments.length) {
        for (let index = 1; index <= segments.length; index++) supported.add(pathKey(segments.slice(0, index)));
      } else if (cut > 0) {
        const kept = segments.slice(0, cut);
        cutRemainders.set(pathKey(kept), kept);
      }
    }
  }

  const out = new Set(facets);
  for (const [key] of cutRemainders) if (!supported.has(key)) out.add(key);
  return [...out].sort();
}

// --- Welke vragensets gelden voor dit product ------------------------------

export interface Placement {
  /** De sets die gelden, de meest specifieke voorop. Leeg = niet gescoord. */
  sets: QuestionSet[];
  /** De categorie op marktniveau waar de voorste set onder valt. */
  category?: string;
  /** De subcategorie, als de voorste set dieper ligt dan het marktniveau. */
  subcategory?: string;
  /** Hing het product alleen onder kenmerken? Dan is het niet te plaatsen. */
  facetOnly: boolean;
}

/**
 * Welke vragensets gelden voor dit product.
 *
 * Per plek waar het hangt de meest specifieke categorie waar een vragenset voor
 * is: "Decoratiestoffen > Lampenkapstoffen" krijgt de lampenkapvragen en niet
 * de algemene decoratievragen. Binnen één tak wint het diepste niveau — dat
 * Magento een lampenkapstof ook onder "Decoratiestoffen" zelf hangt is een
 * eigenschap van het menu, geen tweede markt. Over takken heen gelden ze
 * allemaal: een stof die onder gordijnstoffen én lampenkapstoffen hangt, moet
 * beide vragenlijsten kunnen beantwoorden.
 *
 * De voorste set bepaalt de rij in het rapport: de diepste, en bij gelijke
 * diepte de grootste categorie. Vast, zodat dezelfde catalogus altijd in
 * dezelfde rij uitkomt.
 */
export function placeProduct(
  product: ProductRecord,
  sets: QuestionSet[],
  level: number,
  facets: ReadonlySet<string> = new Set(),
): Placement {
  const raw = categoryMemberships(product);
  if (raw.length === 0) return { sets: [], facetOnly: false };
  const memberships = withoutFacets(raw, facets);
  if (memberships.length === 0) return { sets: [], facetOnly: true };

  const byName = new Map<string, number>();
  sets.forEach((set, index) => {
    if (set.category && !byName.has(normalizeName(set.category))) byName.set(normalizeName(set.category), index);
  });

  interface Hit { index: number; depth: number; path: string[]; top: number }
  const hits: Hit[] = [];
  for (const segments of memberships) {
    const top = Math.min(level, segments.length - 1);
    for (let depth = segments.length - 1; depth >= top; depth--) {
      const index = byName.get(normalizeName(segments[depth]));
      if (index === undefined) continue;
      hits.push({ index, depth, path: segments.slice(0, depth + 1), top });
      break;
    }
  }

  if (hits.length === 0) {
    // Geen eigen set, wel een categorie: de vangnet-set voor de kleine
    // categorieën, als die er is.
    const fallback = sets.find((set) => !set.match);
    const first = memberships[0];
    return {
      sets: fallback ? [fallback] : [],
      category: segmentAt(first, level),
      facetOnly: false,
    };
  }

  // Binnen één tak wint het diepste niveau.
  const deepest = hits.filter((hit) => !hits.some((other) =>
    other.depth > hit.depth
    && pathKey(other.path.slice(0, hit.depth + 1)) === pathKey(hit.path)));

  const ordered = [...deepest].sort((a, b) => b.depth - a.depth || a.index - b.index);
  const unique: Hit[] = [];
  for (const hit of ordered) if (!unique.some((one) => one.index === hit.index)) unique.push(hit);

  const lead = unique[0];
  return {
    sets: unique.map((hit) => sets[hit.index]),
    category: lead.path[lead.top],
    subcategory: lead.depth > lead.top ? lead.path[lead.depth] : undefined,
    facetOnly: false,
  };
}
