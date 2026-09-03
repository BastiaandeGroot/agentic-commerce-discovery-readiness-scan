// Intake: van aangeleverd bestand naar een genormaliseerde dataset.
//
// Een merchant levert altijd minstens een feed aan, en mogelijk daarnaast een
// catalogus-export uit het PIM. Beide gaan door dezelfde molen; alleen de rol
// verschilt. Die tweede bron is wat gap-attributie mogelijk maakt (§7): zonder
// catalogus kunnen we niet zien of een gat een mappingfout of een echt gat is.

import type { Dataset, DatasetRole, ProductRecord } from '../domain/types';
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
  role: DatasetRole,
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

  // Welke canonieke velden kent deze bron überhaupt? Een kolom die bestaat maar
  // overal leeg is, telt mee: het systeem kán het veld dragen. Dat onderscheid
  // is precies wat "mapping gap" van "enrichment gap" scheidt.
  const presentKeys = [...new Set(Object.values(mapping))];

  return {
    role,
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
