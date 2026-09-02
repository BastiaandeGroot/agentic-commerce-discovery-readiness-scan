// Koppeling tussen feed en catalogus, en de vraag welke categorie leidend is.
//
// Beide dingen staan hier omdat ze op dezelfde plek fout gaan: als de koppeling
// mislukt, valt ook de categorie terug op de feed zonder dat iemand het merkt.

import type { Dataset, ProductRecord } from '../domain/types';
import { normalizeColumnName } from '../intake/fieldmap';
import { str } from '../intake/normalize';

/**
 * Kolommen die als join-sleutel kunnen dienen.
 *
 * Feed en catalogus koppelen op één veld is fragiel: een Channable-feed zet vaak
 * de SKU in g:id terwijl het PIM daarnaast een eigen intern id voert. Koppelen we
 * alleen op dat id, dan matcht niets en lijkt élk gat een echt gat — precies de
 * verkeerde conclusie. Daarom indexeren we op alle bruikbare sleutels.
 */
const JOIN_COLUMNS = /^(sku|ean|upc|gtin|mpn|barcode|artikelnummer|artikelcode|productcode)$/;

function joinValues(product: ProductRecord): string[] {
  const values: string[] = [];
  for (const key of ['item_id', 'mpn', 'gtin'] as const) {
    const value = product.values[key];
    if (value) values.push(value.trim());
  }
  for (const [column, value] of Object.entries(product.unmapped)) {
    if (value && JOIN_COLUMNS.test(normalizeColumnName(column))) values.push(value.trim());
  }
  return values;
}

export function indexCatalog(catalog: Dataset | undefined): Map<string, ProductRecord> | undefined {
  if (!catalog) return undefined;
  const index = new Map<string, ProductRecord>();
  for (const product of catalog.products) {
    for (const value of joinValues(product)) {
      // Eerste voorkomen wint; dubbele sleutels zijn zelf een bevinding.
      if (!index.has(value)) index.set(value, product);
    }
  }
  return index;
}

export function lookupCatalog(
  index: Map<string, ProductRecord> | undefined,
  product: ProductRecord,
): ProductRecord | undefined {
  if (!index) return undefined;
  for (const value of joinValues(product)) {
    const hit = index.get(value);
    if (hit) return hit;
  }
  return undefined;
}

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
 * De catalogus gaat vóór de feed. Het PIM is waar de merchant zijn taxonomie
 * daadwerkelijk onderhoudt; de feed is een afgeleide die onderweg wordt afgevlakt
 * — bij de testdata verdween daar een hele hoofdcategorie in, en bleef van
 * "Outdoorstoffen > Gestreept" alleen "Gestreept" over, wat als los thema oogt.
 */
export function mainCategory(
  feedProduct: ProductRecord,
  catalogProduct?: ProductRecord,
): string | undefined {
  const raw = (catalogProduct ? categoryPath(catalogProduct) : undefined) ?? categoryPath(feedProduct);
  if (!raw) return undefined;
  const first = raw.split(/\s*[>/|]\s*/)[0].replace(/\s+/g, ' ').trim();
  if (first === '' || /^\d+$/.test(first)) return undefined;
  return first;
}
