// Spec-snapshot. Eén van de twee assen waarlangs een score kan bewegen zonder
// dat de merchant iets deed (§8). Elke scan verwijst hiernaar, zodat een
// verschil tussen twee scans herleidbaar is tot óf een specwijziging óf een
// wijziging in de vragenset — en niet in het midden blijft hangen.

import { FIELDS } from './fields';
import type { Protocol, Tier } from '../domain/types';

export const SPEC_SNAPSHOT_ID = '2026-09-01';

export const SPEC_SOURCES = [
  { label: 'ACP product feed spec', url: 'https://developers.openai.com/commerce/specs/file-upload/products' },
  { label: 'UCP — Merchant Center voorbereiden', url: 'https://developers.google.com/merchant/ucp/guides/overview/merchant-center' },
  { label: 'UCP-powered checkout', url: 'https://support.google.com/merchants/answer/16837055' },
  { label: 'Merchant Center productdataspecificatie', url: 'https://support.google.com/merchants/answer/7052112' },
];

/** Tel de velden per protocol en tier. Nooit overschrijven met een handmatig getal. */
export function tierCounts(protocol: Protocol): Record<Tier, number> {
  const counts: Record<Tier, number> = { core: 0, selection: 0, out: 0 };
  for (const field of FIELDS) {
    const spec = field[protocol];
    if (spec) counts[spec.tier] += 1;
  }
  return counts;
}
