// Intake: van aangeleverde catalogusexport naar een genormaliseerde dataset.
//
// Eén bron, en dat is met opzet de export uit het systeem waar de merchant zijn
// productkennis werkelijk onderhoudt: zijn PIM of MDM, of anders Magento of
// Shopify. Daar staat wat hij wéét van zijn producten. Een kanaalfeed is een
// afgeleide daarvan en zou een dunner beeld geven van dezelfde catalogus.

import type { Dataset, ProductRecord } from '../domain/types';
import { parseAny } from './parse';
import { buildMapping } from './fieldmap';
import { isBlank, str } from './normalize';

export class IntakeError extends Error {}

/** Bepaal de join-sleutel van een record: SKU, anders GTIN, anders positie. */
function recordKey(values: Record<string, string>, index: number): string {
  return str(values.item_id) ?? str(values.gtin) ?? str(values.mpn) ?? `#${index + 1}`;
}

export const PREVIEW_ROWS = 10;

export function ingest(
  filename: string,
  text: string,
  /** Correcties van de merchant op onze kolomherkenning. */
  overrides: Record<string, string | null> = {},
): Dataset {
  if (text.trim() === '') {
    throw new IntakeError(`${filename} is leeg.`);
  }

  const { format, rows } = parseAny(filename, text);
  if (rows.length === 0) {
    throw new IntakeError(
      `In ${filename} zijn geen productregels gevonden. Herkend als ${format}.`,
    );
  }

  // Verzamel alle kolommen die érgens voorkomen; JSON-records zijn niet altijd
  // even breed, dus de eerste regel alleen is niet genoeg.
  const columns = new Set<string>();
  for (const row of rows.slice(0, 500)) {
    for (const key of Object.keys(row)) columns.add(key);
  }
  const columnList = [...columns];

  const { mapping, unmapped } = buildMapping(columnList, overrides);

  const products: ProductRecord[] = rows.map((row, index) => {
    const values: Record<string, string> = {};
    const unmappedValues: Record<string, string> = {};
    for (const [column, raw] of Object.entries(row)) {
      if (isBlank(raw)) continue;
      const key = mapping[column];
      if (key) {
        // Eerste gevulde bron wint; een tweede kolom vult alleen aan.
        if (values[key] === undefined) values[key] = String(raw).trim();
      } else {
        unmappedValues[column] = String(raw).trim();
      }
    }
    return { key: recordKey(values, index), values, unmapped: unmappedValues };
  });

  // Welke canonieke velden kent deze catalogus überhaupt? Een kolom die bestaat
  // maar overal leeg is telt mee: het systeem kán het veld dragen. Dat
  // onderscheid is precies wat invulwerk van modelwerk scheidt — de plek bestaat
  // al, of hij moet nog gemaakt worden.
  const presentKeys = [...new Set(Object.values(mapping))];

  return {
    filename,
    format,
    columns: columnList,
    preview: rows.slice(0, PREVIEW_ROWS),
    products,
    mapping,
    unmappedColumns: unmapped,
    presentKeys,
  };
}
