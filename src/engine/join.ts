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
export function mainCategory(product: ProductRecord): string | undefined {
  const raw = categoryPath(product);
  if (!raw) return undefined;
  const first = raw.split(/\s*[>/|]\s*/)[0].replace(/\s+/g, ' ').trim();
  if (first === '' || /^\d+$/.test(first)) return undefined;
  return first;
}
