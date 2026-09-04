// Het veldenregister als momentopname.
//
// Eén van de drie assen waarlangs een score kan bewegen zonder dat de merchant
// iets deed. De andere twee zijn de scanregels en de vragenbank.
//
// Dat dit register meebeweegt is minder zichtbaar dan het klinkt: een kolomnaam
// die als alias wordt toegevoegd zorgt ervoor dat een kenmerk dat er altijd al
// stond ineens herkend wordt. Dat leest als vooruitgang terwijl er niets aan de
// data veranderde. Daarom draagt elk rapport dit nummer.

import { FIELDS } from './fields';
import type { OwnerSystem } from '../domain/types';

export const FIELD_REGISTER_ID = '2026-09-04';

/** Hoeveel velden er per eigenaar in het register staan. */
export function ownerCounts(): Record<OwnerSystem, number> {
  const counts = {} as Record<OwnerSystem, number>;
  for (const field of FIELDS) {
    counts[field.owner] = (counts[field.owner] ?? 0) + 1;
  }
  return counts;
}

export const FIELD_COUNT = FIELDS.length;
