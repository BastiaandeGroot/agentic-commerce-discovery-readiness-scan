// Veldherkenning: bronkolom -> canonieke sleutel.
//
// Elke merchant noemt zijn kolommen anders. Een Channable-feed schrijft
// "g:google_product_category", een Magento-export "google_category", een
// handgemaakte CSV "Google categorie". Ze wijzen alle drie naar hetzelfde veld.
//
// De mapping wordt in het rapport getoond, zodat een merchant kan zien wat we
// waarvoor hebben aangezien — en kan tegenspreken als we ernaast zitten.

import { FIELDS } from '../spec/fields';

/**
 * Breng een kolomnaam terug tot een vergelijkbare vorm:
 * "g:Google Product Category" en "google_product_category" worden gelijk.
 */
export function normalizeColumnName(raw: string): string {
  return raw
    .replace(/^\s*[a-z]+:/i, '')       // namespace-prefix (g:, mc:, item:) weg
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')       // spaties, punten, streepjes -> underscore
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Alias -> canonieke sleutel, één keer opgebouwd. */
const ALIAS_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const field of FIELDS) {
    // De sleutel zelf telt ook als alias.
    for (const alias of [field.key, ...field.aliases]) {
      const norm = normalizeColumnName(alias);
      // Eerste definitie wint: de volgorde in fields.ts is de voorrangsvolgorde.
      if (!index.has(norm)) index.set(norm, field.key);
    }
  }
  return index;
})();

/**
 * Zoek de canonieke sleutel bij één bronkolom.
 * Eerst exact, dan op laatste segment (voor platgeslagen puntnotatie), dan op
 * het langst passende deel — de langste alias wint, zodat "shipping_weight"
 * bij gewicht landt en niet bij verzending.
 */
export function matchColumn(rawColumn: string): string | undefined {
  const norm = normalizeColumnName(rawColumn);
  if (norm === '') return undefined;

  const exact = ALIAS_INDEX.get(norm);
  if (exact) return exact;

  // "native_commerce.checkout_eligibility" -> probeer "checkout_eligibility"
  const segments = norm.split('_');
  for (let start = 1; start < segments.length; start++) {
    const tail = segments.slice(start).join('_');
    const hit = ALIAS_INDEX.get(tail);
    if (hit) return hit;
  }

  // Deelmatch: alleen als de alias een heel woordsegment beslaat.
  let best: { key: string; length: number } | undefined;
  for (const [alias, key] of ALIAS_INDEX) {
    if (alias.length < 4) continue; // te kort om betrouwbaar te matchen
    const boundary = new RegExp(`(^|_)${alias}($|_)`);
    if (boundary.test(norm) && (!best || alias.length > best.length)) {
      best = { key, length: alias.length };
    }
  }
  return best?.key;
}

export interface ColumnMapping {
  /** Bronkolom -> canonieke sleutel. */
  mapping: Record<string, string>;
  /** Bronkolommen die nergens op matchten. */
  unmapped: string[];
}

/** Bouw de mapping voor een set bronkolommen. */
export function buildMapping(columns: string[]): ColumnMapping {
  const mapping: Record<string, string> = {};
  const unmapped: string[] = [];
  const claimed = new Set<string>();

  // Twee rondes: exacte treffers claimen hun sleutel eerst, zodat een vage
  // deelmatch een exacte niet kan verdringen.
  for (const column of columns) {
    const norm = normalizeColumnName(column);
    const exact = ALIAS_INDEX.get(norm);
    if (exact && !claimed.has(exact)) {
      mapping[column] = exact;
      claimed.add(exact);
    }
  }
  for (const column of columns) {
    if (mapping[column]) continue;
    const key = matchColumn(column);
    if (key && !claimed.has(key)) {
      mapping[column] = key;
      claimed.add(key);
    } else {
      unmapped.push(column);
    }
  }

  return { mapping, unmapped };
}
