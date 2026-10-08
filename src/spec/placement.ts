// Het ene kenmerk dat de categorieboom kan dragen: waar een product voor bedoeld is.
//
// Een winkel die zijn stoffen onder Stoelen, Banken en Tassenstoffen hangt, heeft
// daarmee vastgelegd waar ze voor bedoeld zijn — alleen als categorie en niet als
// kenmerk. Een agent die de catalogus krijgt ziet die categorieën ook. De scan
// die doet alsof dat er niet staat, meet strenger dan de werkelijkheid.
//
// Twee grenzen houden het eerlijk:
//
//   1. Alleen dit ene begrip. Een categorie zegt niets over breedte of
//      slijtvastheid, en een boom die "Verduisterend" als categorie heeft draagt
//      daarmee nog geen lichtdoorlatendheid: dat is een kenmerk dat ontbreekt.
//   2. Alleen een plek die de vragenbank als segment van de markt kent (een set
//      met een eigen overlay). Wat de bank niet kent — een verzamelcategorie, een
//      actie, een motief — zegt niet waar een product voor dient. Zie
//      `evaluateProduct`.
//
// De woorden zijn generiek, zoals in `lexicon.ts`: zo noemt élke catalogus dit.
// De hele naam moet het begrip zijn; `toepassing_garen` of `geschikt_voor_stofsoort`
// is een ander kenmerk en valt hier niet onder.

/**
 * Het veld dat in `found` staat als de boom het antwoord droeg. Geen kolom: het
 * reist mee als herkomst, zodat het rapport kan zeggen dat het antwoord nergens
 * als kenmerk vastligt.
 */
export const PLACEMENT_FIELD = 'tree:category';

const PLACEMENT_NAMES = new Set([
  'toepassing', 'toepassingen', 'toepassingsgebied', 'gebruiksdoel', 'gebruik',
  'geschiktvoor', 'bedoeldvoor',
  'application', 'applications', 'intendeduse', 'enduse', 'usage', 'use',
  'suitablefor', 'verwendung', 'verwendungszweck', 'einsatzbereich',
]);

/** Is dit het kenmerk dat zegt waar een product voor bedoeld is? */
export function isPlacementAttribute(attributeKey: string): boolean {
  return PLACEMENT_NAMES.has(attributeKey.toLowerCase().replace(/[^a-z]/g, ''));
}
