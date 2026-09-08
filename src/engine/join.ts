// Welke categorie is leidend voor een product?
//
// De categorie bepaalt welke vragenset erop wordt losgelaten, en daarmee waar de
// merchant op afgerekend wordt. Een product dat op "simple" of op "2669" uitkomt
// krijgt een vragenset die niet over zijn markt gaat, en dat is erger dan geen
// vragenset — vandaar de uitsluitingen hieronder.

import type { ProductRecord } from '../domain/types';
import { str } from '../intake/normalize';

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

/** Het categoriepad van één record, uit de best beschikbare kolom. */
export function categoryPath(record: ProductRecord): string | undefined {
  const columns = Object.entries(record.unmapped).filter(([column, value]) => {
    if (!CATEGORY_COLUMN.test(column) || NOT_A_NAME.test(column)) return false;
    const v = str(value);
    return v !== undefined && !/^\d+$/.test(v) && !/^https?:/i.test(v);
  });

  // De hoofdcategorie gaat voor. Een PIM levert vaak ook een lijst met álle
  // categorieen waar een product in hangt; het eerste item daaruit is willekeurig
  // en zou de telling scheeftrekken.
  const primary = columns.filter(([column]) => /main|primary|hoofd/i.test(column));
  const pick = primary[0] ?? columns[0];
  if (pick) return pick[1].trim();

  const own = str(record.values.product_type);
  if (own && !RECORD_TYPES.test(own)) return own;

  // De Google-productcategorie is de laatste optie, en alleen als hij een pad is.
  // Een feed die daar "2669" invult geeft een verwijzing naar Googles taxonomie,
  // geen categorienaam; daar een vragenset op bouwen levert een set "2669" op.
  const google = str(record.values.product_category);
  return google && !/^\d+$/.test(google) ? google : undefined;
}

/**
 * De hoofdcategorie van een product: het eerste segment van het categoriepad.
 *
 * Het eerste segment en niet het hele pad, want daar zit de markt in. "Meubel-
 * stoffen > Gestreept > Blauw" is één markt met twee filters erachter; per volledig
 * pad een vragenset maken zou tientallen sets van drie producten opleveren.
 */
export function mainCategory(product: ProductRecord, level = 0): string | undefined {
  const raw = categoryPath(product);
  if (!raw) return undefined;
  const parts = raw.split(/\s*[>/|]\s*/).map((part) => part.replace(/\s+/g, ' ').trim());
  // Zakt een product niet zo diep, dan is zijn diepste niveau het beste dat er
  // is. Anders zou een product dat maar één segment draagt uit de meting vallen.
  const pick = parts[level] ?? parts[parts.length - 1];
  if (pick === undefined || pick === '' || /^\d+$/.test(pick)) return undefined;
  return pick;
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
  const paths = products
    .map((product) => categoryPath(product))
    .filter((raw): raw is string => raw !== undefined)
    .map((raw) => raw.split(/\s*[>/|]\s*/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean));
  if (paths.length === 0) return 0;

  const known = new Set(knownSegments.map(normalize));
  const deepest = Math.max(...paths.map((parts) => parts.length));

  for (let level = 0; level < deepest - 1; level++) {
    const distinct = new Set<string>();
    for (const parts of paths) {
      const value = parts[level];
      if (value && !/^\d+$/.test(value)) distinct.add(value);
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

/**
 * Het tweede segment van het categoriepad, als dat er is.
 *
 * Bewust géén eigen vragenset: de vragenlijst kent vragen per markt, niet per
 * filter, en per volledig pad meten zou tientallen sets van drie producten
 * opleveren. Wél bruikbaar om binnen één categorie te kijken waar het werk zit —
 * "Outdoorstoffen > Gestreept" kan een heel ander gat hebben dan de rest.
 */
export function subCategory(product: ProductRecord, level = 0): string | undefined {
  const raw = categoryPath(product);
  if (!raw) return undefined;
  const second = raw.split(/\s*[>/|]\s*/)[level + 1]?.replace(/\s+/g, ' ').trim();
  return second === undefined || second === '' || /^\d+$/.test(second) ? undefined : second;
}
