// Wat er in een kolom staat, gemeten over de hele catalogus.
//
// Een kolomnaam zegt weinig en een handvol voorbeeldwaarden uit de eerste
// regels zegt vaak het verkeerde: bij een export die op categorie gesorteerd is,
// zijn de eerste 500 producten allemaal meubelstof. Dit profiel kijkt naar élk
// product en legt vast wat een koppeling kan toetsen zonder model:
//
//   - hoe vaak de kolom gevuld is,
//   - wat voor waarde erin staat (ja/nee, een getal met eenheid, een vaste
//     lijst, een code of vrije tekst),
//   - en in welke categorieën hij gevuld is. Dat laatste is het sterkste signaal:
//     een kolom die alleen bij tafelkleedstoffen gevuld is, hoort bij een
//     kenmerk uit die vragenset.
//
// Het wordt opgebouwd zodra de catalogus er is, in de browser. Puur en
// deterministisch: dezelfde catalogus geeft hetzelfde profiel.

import type { Dataset, ProductRecord } from '../domain/types';
import { categoryMemberships, segmentAt, withoutFacets } from './join';

export type ValueKind = 'empty' | 'boolean' | 'number' | 'list' | 'code' | 'text';

export interface CategoryFill {
  category: string;
  filled: number;
  total: number;
}

export interface ColumnProfile {
  column: string;
  filled: number;
  total: number;
  kind: ValueKind;
  /** De eenheid die bij de getallen staat, als die er is. */
  unit?: string;
  /** Hoeveel verschillende waarden, afgekapt op `DISTINCT_CAP`. */
  distinct: number;
  /** Cellen dragen meer dan één waarde ("Cotton | Polyester"). */
  multi: boolean;
  /**
   * Prijs of voorraad. Die kolom bestaat en mag gekoppeld worden, maar zijn
   * waarden gaan nooit naar een model.
   */
  sensitive: boolean;
  /** De vaakst voorkomende waarden, bij gelijke stand in volgorde van eerste voorkomen. */
  samples: string[];
  /** Per marktcategorie hoe vaak de kolom gevuld is, de best gevulde voorop. */
  categories: CategoryFill[];
  /**
   * De intake legde deze kolom samen met een andere op één canoniek veld. Dan
   * zijn de waarden niet meer per kolom te scheiden en geldt het profiel voor
   * het veld.
   */
  shared: boolean;
}

/** Boven dit aantal verschillende waarden tellen we niet verder. */
const DISTINCT_CAP = 1000;
/** Een vaste lijst heeft weinig verschillende waarden, ook op veel producten. */
const LIST_MAX = 40;
/** Welk deel van de waarden aan een vorm moet voldoen om die vorm te krijgen. */
const SHARE = 0.9;
const SAMPLES = 5;
const VALUE_LENGTH = 40;

/**
 * Woorden voor ja en nee, in de talen waarin een Europese export ze schrijft.
 * `0` en `1` staan er niet in: een gewichtskolom vol nullen is geen ja/nee. Die
 * tellen alleen als de hele kolom uit 0 en 1 bestaat.
 */
const BOOLEAN = new Set([
  'ja', 'nee', 'yes', 'no', 'true', 'false', 'j', 'n', 'y', 'waar', 'onwaar',
  'nein', 'wahr', 'falsch', 'oui', 'non', 'vrai', 'faux', 'si', 'sí',
]);

/**
 * Scheidingstekens van een meervoudige keuze, per systeem anders: Magento
 * schrijft " | ", Akeneo en Shopify een komma, sommige PIM's een puntkomma.
 * Welke een kolom gebruikt, volgt uit de kolom zelf (`separatorOf`).
 */
const SEPARATORS = ['|', ';', ','];
/** Een scheidingsteken telt pas mee als het in minstens dit deel van de cellen staat. */
const MULTI_CELLS = 0.1;
/** Hoe vaak een losse waarde gemiddeld moet terugkomen; anders is het gewone tekst. */
const MULTI_REUSE = 2;
/** Hoe lang een losse waarde gemiddeld hoogstens is; een zin is geen keuze. */
const PART_LENGTH = 30;

/**
 * Kolommen met een prijs of een voorraad. De koppelroute belooft dat er nooit
 * een prijs of een aantal meegaat; de naam mag, de waarden niet.
 *
 * Gezocht op woorden in de genormaliseerde kolomnaam, zodat Magento
 * (`special_price`), Shopify ("Variant Price", "Cost per item"), WooCommerce
 * ("Regular price") en Akeneo (`price-EUR`) allemaal gevangen worden. Liever een
 * kolom te veel: dan gaat alleen zijn naam mee en verder niets.
 */
const SENSITIVE = new RegExp([
  // Samenstellingen horen erbij: inkoopprijs, verzendkosten, sellprice.
  '(^|_)[a-z]*(price|prices|pricing|prijs|prijzen|preis|prix|precio|kosten)[a-z]*(_|$)',
  '(^|_)(cost|costs|msrp|rrp|qty|quantity|stock|voorraad|lagerbestand|inventory|aantal)(_|$)',
].join('|'));

export function isSensitiveName(name: string): boolean {
  const normalized = name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  return SENSITIVE.test(normalized);
}

/**
 * Eenheden die elke catalogus gebruikt, over verticals heen: maat, gewicht,
 * inhoud, temperatuur, vermogen, licht, geluid, opslag. Geen vaktaal: die hoort
 * bij de markt. Losse letters die ook in een code staan (a, s, t) zijn weggelaten.
 */
const UNITS = [
  'g/m²', 'g/m2', 'gr/m2', 'g/m1', 'g/m', 'gsm', 'kg/m', 'kg', 'mg', 'gr', 'g', 'oz', 'lbs', 'lb',
  'mm²', 'mm2', 'mm', 'µm', 'cm²', 'cm2', 'cm³', 'cm3', 'cm', 'm²', 'm2', 'm³', 'm3', 'km', 'mtr', 'm',
  'inch', 'in', 'ft', '"',
  'ml', 'cl', 'dl', 'ltr', 'l',
  '°c', '°f', '°', '%',
  'kwh', 'wh', 'kw', 'w', 'mah', 'ah', 'ma', 'v', 'hz', 'khz',
  'lm', 'lux', 'k', 'db',
  'gb', 'tb', 'mb',
  'kcal', 'kj', 'bar', 'pa',
].sort((a, b) => b.length - a.length);
const NUMBER = new RegExp(
  `^[-+]?(?:\\d{1,3}(?:[.,\\s\\u00a0]\\d{3})+|\\d+)(?:[.,]\\d+)?\\s*(${UNITS.map((unit) => unit.replace(/[.*+?^${}()|[\]\\/"]/g, '\\$&')).join('|')})?$`,
  'i',
);
const CODE = /^(?=.*\d)[a-z0-9][a-z0-9\-/.]{3,}$/i;

function valueOf(product: ProductRecord, column: string, canonical: string | undefined): string | undefined {
  const raw = canonical ? product.values[canonical] : product.unmapped[column];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

interface Tally {
  filled: number;
  /** De ruwe celwaarden; pas na de hele catalogus weten we of ze gesplitst moeten worden. */
  raw: Map<string, number>;
  byCategory: Map<string, { filled: number; total: number }>;
}

/** Het profiel van elke kolom in de catalogus, op het niveau van de marktcategorieën. */
export function profileCatalog(
  catalog: Dataset,
  level = 0,
  /** Paden die de merchant als kenmerk liet staan; die tellen niet als categorie. */
  facets: ReadonlySet<string> = new Set(),
): Record<string, ColumnProfile> {
  const byCanonical = new Map<string, number>();
  for (const canonical of Object.values(catalog.mapping)) {
    byCanonical.set(canonical, (byCanonical.get(canonical) ?? 0) + 1);
  }

  const tallies = new Map<string, Tally>();
  for (const column of catalog.columns) {
    tallies.set(column, { filled: 0, raw: new Map(), byCategory: new Map() });
  }

  for (const product of catalog.products) {
    const categories = [...new Set(withoutFacets(categoryMemberships(product), facets).map((path) => segmentAt(path, level)))];
    for (const column of catalog.columns) {
      const tally = tallies.get(column) as Tally;
      const value = valueOf(product, column, catalog.mapping[column]);
      for (const category of categories) {
        const entry = tally.byCategory.get(category) ?? { filled: 0, total: 0 };
        entry.total += 1;
        if (value !== undefined) entry.filled += 1;
        tally.byCategory.set(category, entry);
      }
      if (value === undefined) continue;
      tally.filled += 1;
      const seen = tally.raw.get(value);
      if (seen !== undefined) tally.raw.set(value, seen + 1);
      else if (tally.raw.size < DISTINCT_CAP) tally.raw.set(value, 1);
    }
  }

  const out: Record<string, ColumnProfile> = {};
  for (const column of catalog.columns) {
    const tally = tallies.get(column) as Tally;
    const canonical = catalog.mapping[column];
    const separator = separatorOf(tally.raw);
    const counts = separator ? splitCounts(tally.raw, separator) : tally.raw;
    const { kind, unit } = classify(counts, tally.filled);
    out[column] = {
      column,
      filled: tally.filled,
      total: catalog.products.length,
      kind,
      unit,
      distinct: counts.size,
      multi: separator !== undefined,
      sensitive: isSensitive(column, canonical, kind, counts),
      samples: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, SAMPLES)
        .map(([value]) => (value.length > VALUE_LENGTH ? `${value.slice(0, VALUE_LENGTH)}…` : value)),
      categories: [...tally.byCategory.entries()]
        .map(([category, entry]) => ({ category, ...entry }))
        .sort((a, b) => b.filled / b.total - a.filled / a.total || b.total - a.total || a.category.localeCompare(b.category)),
      shared: canonical !== undefined && (byCanonical.get(canonical) ?? 0) > 1,
    };
  }
  return out;
}

/** Een bedrag: een valutateken of -code naast een getal. */
const CURRENCY = /(€|\$|£|¥|\b(eur|usd|gbp|chf)\b)\s*\d|\d\s*(€|\$|£|¥|\b(eur|usd|gbp|chf)\b)/i;

/**
 * Of de waarden van deze kolom nooit naar een model mogen.
 *
 * Twee wegen, en elk volstaat. Een bedrag herken je aan zijn valutateken, hoe de
 * kolom ook heet. En een kolom die naar prijs of voorraad heet, is gevoelig zodra
 * er getallen of codes in staan. Staat er iets anders in — "Per meter", "Roll
 * price", ja/nee — dan is het geen bedrag maar een verkoopwijze, en die draagt
 * juist het antwoord op "hoe wordt dit verkocht".
 */
function isSensitive(column: string, canonical: string | undefined, kind: ValueKind, counts: Map<string, number>): boolean {
  const entries = [...counts.entries()];
  const tracked = entries.reduce((sum, [, count]) => sum + count, 0);
  if (tracked > 0) {
    const money = entries.reduce((sum, [value, count]) => sum + (CURRENCY.test(value) ? count : 0), 0);
    if (money / tracked >= 0.5) return true;
  }
  const named = isSensitiveName(column) || (canonical !== undefined && isSensitiveName(canonical));
  if (!named) return false;
  if (kind === 'boolean') return false;
  if (kind === 'list' || kind === 'text') return entries.some(([value]) => /\d/.test(value));
  return true;
}

/** Een cel die zelf een getal is ("1,5 kg", "1.000") wordt nooit gesplitst. */
const splittable = (value: string, separator: string) => value.includes(separator) && !NUMBER.test(value);

function splitCounts(raw: Map<string, number>, separator: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [value, count] of raw) {
    const parts = splittable(value, separator)
      ? value.split(separator).map((part) => part.trim()).filter(Boolean)
      : [value];
    for (const part of parts) out.set(part, (out.get(part) ?? 0) + count);
  }
  return out;
}

/**
 * Het scheidingsteken van een meervoudige keuze, als de kolom er een heeft.
 *
 * Een komma staat ook in gewone tekst, dus het teken alleen zegt niets. Wat een
 * keuze verraadt is dat de stukken kort zijn en terugkomen: "Cotton, Polyester"
 * en "Cotton, Linen" delen "Cotton", terwijl de zinnen in een omschrijving elk
 * maar één keer voorkomen. Bij twijfel niet splitsen; dan blijft het tekst, en
 * dat is wat er voorheen ook stond.
 */
function separatorOf(raw: Map<string, number>): string | undefined {
  const tracked = [...raw.values()].reduce((sum, count) => sum + count, 0);
  if (tracked === 0) return undefined;
  for (const separator of SEPARATORS) {
    let cells = 0;
    for (const [value, count] of raw) if (splittable(value, separator)) cells += count;
    if (cells / tracked < MULTI_CELLS) continue;

    const parts = splitCounts(raw, separator);
    const occurrences = [...parts.values()].reduce((sum, count) => sum + count, 0);
    const length = [...parts.keys()].reduce((sum, part) => sum + part.length, 0) / parts.size;
    if (parts.size <= raw.size && occurrences / parts.size >= MULTI_REUSE && length <= PART_LENGTH) {
      return separator;
    }
  }
  return undefined;
}

/**
 * De vorm van de waarden, gewogen naar hoe vaak ze voorkomen.
 *
 * Streng: pas als negen op de tien gevulde cellen aan een vorm voldoen krijgt
 * de kolom die vorm. Een kolom met "120 cm" en af en toe "zie omschrijving" is
 * een getal; een kolom die half getal, half tekst is, is tekst. Bij twijfel
 * liever een ruimere vorm, want een te strenge vorm sluit straks een kolom uit
 * die wél klopt.
 */
function classify(counts: Map<string, number>, filled: number): { kind: ValueKind; unit?: string } {
  if (filled === 0) return { kind: 'empty' };
  const entries = [...counts.entries()];
  // Gewogen over de waarden die geteld zijn. Boven `DISTINCT_CAP` worden nieuwe
  // waarden niet meer bijgehouden, en tegen alle gevulde cellen afzetten zou een
  // kolom met duizenden artikelnummers dan nooit een vorm geven.
  const tracked = entries.reduce((sum, [, count]) => sum + count, 0);
  const share = (test: (value: string) => boolean) =>
    entries.reduce((sum, [value, count]) => sum + (test(value) ? count : 0), 0) / tracked;

  if (share((value) => BOOLEAN.has(value.toLowerCase())) >= SHARE) return { kind: 'boolean' };
  if (entries.length === 2 && entries.every(([value]) => value === '0' || value === '1')) return { kind: 'boolean' };

  if (share((value) => NUMBER.test(value)) >= SHARE) {
    const units = new Map<string, number>();
    for (const [value, count] of entries) {
      const unit = NUMBER.exec(value)?.[1]?.toLowerCase();
      if (unit) units.set(unit, (units.get(unit) ?? 0) + count);
    }
    const top = [...units.entries()].sort((a, b) => b[1] - a[1])[0];
    return { kind: 'number', unit: top && top[1] / tracked >= 0.5 ? top[0] : undefined };
  }

  if (counts.size <= LIST_MAX && counts.size < tracked) return { kind: 'list' };
  if (share((value) => CODE.test(value)) >= SHARE) return { kind: 'code' };
  return { kind: 'text' };
}

/** Een categorie telt als gevuld vanaf dit deel. */
const CATEGORY_FILLED = 0.5;

/**
 * De categorieën waar de kolom werkelijk gevuld is.
 *
 * Leeg als hij overal gevuld is of nergens: dan onderscheidt het niets, en een
 * lijst van alle categorieën zegt niet meer dan "overal".
 */
export function filledIn(profile: ColumnProfile): string[] {
  const filled = profile.categories.filter((entry) => entry.filled / entry.total >= CATEGORY_FILLED);
  return filled.length === profile.categories.length ? [] : filled.map((entry) => entry.category);
}
