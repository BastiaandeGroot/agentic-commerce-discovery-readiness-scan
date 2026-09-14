// Waar een kenmerk en een kolom over gáán, opgeschreven voor een taalmodel.
//
// Dit is de kern van "zo dicht mogelijk bij hoe een agent je data leest". Een
// agent die `gordijn_dichtheid` tegenkomt kijkt niet alleen naar die naam; hij
// ziet er "dicht", "transparant", "half" onder staan en weet dan waar de kolom
// over gaat. Alleen de naam vergelijken is precies wat een zoekpatroon al doet,
// en daar houdt het bij vaktaal op.
//
// Andersom geldt hetzelfde: een kenmerk is pas te plaatsen als je weet welke
// vraag erop leunt. `rapport_hoogte_cm` zegt weinig; `rapport_hoogte_cm` met
// "Heeft deze stof een rapport, en hoe groot is dat?" eronder zegt alles.
//
// Puur en deterministisch: dezelfde catalogus geeft dezelfde beschrijving, want
// de waarden worden in vaste volgorde verzameld en niet gesampled.

import type { AttributeShape, Dataset } from '../domain/types';
import { filledIn, type ColumnProfile } from '../engine/profile';

/** Hoeveel producten er hoogstens doorzocht worden voor voorbeeldwaarden. */
const SCAN_LIMIT = 500;

/** Hoeveel verschillende waarden een kolom laat zien. Genoeg voor de smaak. */
const SAMPLE_VALUES = 5;

/** Hoeveel tekens een enkele voorbeeldwaarde mag innemen. */
const VALUE_LENGTH = 40;

/**
 * De waarde van een ruwe kolom bij één product.
 *
 * De intake splitst een record in herkende velden (op canonieke sleutel) en de
 * rest (op de eigen kolomnaam). Om een kolom terug te vinden moet je dus weten
 * welke kant hij op ging.
 */
function valueOf(
  product: Dataset['products'][number],
  column: string,
  canonical: string | undefined,
): string | undefined {
  const raw = canonical ? product.values[canonical] : product.unmapped[column];
  return raw === undefined || raw === '' ? undefined : raw;
}

/**
 * De eerste verschillende waarden in een kolom, in vaste volgorde.
 *
 * Dezelfde waarden die een model te zien krijgt, en ook wat de merchant op het
 * koppelscherm onder zijn keuze ziet: "PU-coating, acryl, geen" zegt meteen of
 * de kolom klopt, waar een kolomnaam dat niet doet. Leeg betekent dat de kolom
 * in de eerste producten nergens gevuld is.
 */
export function sampleValues(column: string, catalog: Dataset, count = SAMPLE_VALUES): string[] {
  const canonical = catalog.mapping[column];
  const seen: string[] = [];

  for (const product of catalog.products.slice(0, SCAN_LIMIT)) {
    const value = valueOf(product, column, canonical);
    if (value === undefined) continue;
    const trimmed = value.length > VALUE_LENGTH ? `${value.slice(0, VALUE_LENGTH)}…` : value;
    if (!seen.includes(trimmed)) seen.push(trimmed);
    if (seen.length >= count) break;
  }
  return seen;
}

/**
 * Een kolom zoals een lezer hem tegenkomt: de naam, en wat erin staat.
 *
 * Herkende kolommen delen hun canonieke veld met andere kolommen — `rol_breedte`
 * en `stof_breedte` worden allebei `dimensions` — en dan zijn hun waarden niet
 * meer los te trekken. Dat is een beperking van de intake en geen reden om de
 * kolom over te slaan; de naam alleen blijft dan over.
 */
export function describeColumn(column: string, catalog: Dataset, profile?: ColumnProfile): string {
  const readable = column.replace(/[_.]+/g, ' ').trim();
  if (profile) return describeProfile(readable, profile);
  const seen = sampleValues(column, catalog);
  return seen.length === 0 ? readable : `${readable}: ${seen.join(', ')}`;
}

/** Hoe lang een beschrijving hoogstens mag zijn; de koppelroute weigert langer. */
const DESCRIPTION_LENGTH = 400;

/**
 * Een kolom met zijn profiel, voor het model.
 *
 * Wat erbij komt zijn de vorm van de waarden en de namen van de categorieën
 * waar hij gevuld is — geen aantal, geen percentage. Categorienamen gaan bij
 * het koppelen van de vragensets al mee; hoeveel producten iets draagt niet, en
 * dat blijft zo.
 */
function describeProfile(readable: string, profile: ColumnProfile): string {
  const base = profile.kind === 'number' && profile.unit ? `getal (${profile.unit})` : KIND_TEXT[profile.kind];
  const form = profile.multi ? `${base}, meerdere per product` : base;
  // Een prijs of een voorraad: de naam gaat mee, de waarden nooit.
  if (profile.sensitive) return readable;
  const where = filledIn(profile);
  const parts = [
    `${readable} [${form}${where.length > 0 ? `; gevuld in ${where.slice(0, 4).join(', ')}` : ''}]`,
  ];
  if (profile.samples.length > 0) parts.push(profile.samples.join(', '));
  const text = parts.join(': ');
  return text.length > DESCRIPTION_LENGTH ? `${text.slice(0, DESCRIPTION_LENGTH - 1)}…` : text;
}

const KIND_TEXT: Record<ColumnProfile['kind'], string> = {
  empty: 'leeg',
  boolean: 'ja/nee',
  number: 'getal',
  list: 'vaste lijst',
  code: 'code',
  text: 'vrije tekst',
};

/** Eén kenmerk met de vragen die erop leunen. */
export interface DescribableAttribute {
  key: string;
  questions: string[];
  /** Wat de bank in dit kenmerk verwacht, als de typering bevestigd is. */
  shape?: AttributeShape;
}

/**
 * Een kenmerk zoals het bedoeld is: de naam, en waar hij voor gesteld wordt.
 *
 * Hooguit twee vragen. Een derde voegt weinig betekenis toe en verdunt de rest,
 * en bij een kenmerk waar tien vragen op leunen zou de naam erin verdrinken.
 */
export function describeAttribute(attribute: DescribableAttribute): string {
  const base = attribute.key.replace(/[_.]+/g, ' ').trim();
  const readable = attribute.shape ? `${base} [${shapeText(attribute.shape)}]` : base;
  const questions = attribute.questions.slice(0, 2);
  return questions.length === 0 ? readable : `${readable}: ${questions.join(' ')}`;
}

/** Een kenmerktype in dezelfde woorden als een kolomprofiel, zodat het model ze naast elkaar legt. */
function shapeText(shape: AttributeShape): string {
  if (shape.kind === 'number' && shape.unit) return `getal (${shape.unit})`;
  if (shape.kind === 'list' && shape.values && shape.values.length > 0) {
    return `vaste lijst: ${shape.values.slice(0, 5).join(', ')}`;
  }
  return KIND_TEXT[shape.kind];
}
