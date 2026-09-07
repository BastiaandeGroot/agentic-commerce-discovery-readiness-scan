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

import type { Dataset } from '../domain/types';

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
 * Een kolom zoals een lezer hem tegenkomt: de naam, en wat erin staat.
 *
 * Herkende kolommen delen hun canonieke veld met andere kolommen — `rol_breedte`
 * en `stof_breedte` worden allebei `dimensions` — en dan zijn hun waarden niet
 * meer los te trekken. Dat is een beperking van de intake en geen reden om de
 * kolom over te slaan; de naam alleen blijft dan over.
 */
export function describeColumn(column: string, catalog: Dataset): string {
  const canonical = catalog.mapping[column];
  const seen: string[] = [];

  for (const product of catalog.products.slice(0, SCAN_LIMIT)) {
    const value = valueOf(product, column, canonical);
    if (value === undefined) continue;
    const trimmed = value.length > VALUE_LENGTH ? `${value.slice(0, VALUE_LENGTH)}…` : value;
    if (!seen.includes(trimmed)) seen.push(trimmed);
    if (seen.length >= SAMPLE_VALUES) break;
  }

  const readable = column.replace(/[_.]+/g, ' ').trim();
  return seen.length === 0 ? readable : `${readable}: ${seen.join(', ')}`;
}

/** Eén kenmerk met de vragen die erop leunen. */
export interface DescribableAttribute {
  key: string;
  questions: string[];
}

/**
 * Een kenmerk zoals het bedoeld is: de naam, en waar hij voor gesteld wordt.
 *
 * Hooguit twee vragen. Een derde voegt weinig betekenis toe en verdunt de rest,
 * en bij een kenmerk waar tien vragen op leunen zou de naam erin verdrinken.
 */
export function describeAttribute(attribute: DescribableAttribute): string {
  const readable = attribute.key.replace(/[_.]+/g, ' ').trim();
  const questions = attribute.questions.slice(0, 2);
  return questions.length === 0 ? readable : `${readable}: ${questions.join(' ')}`;
}
