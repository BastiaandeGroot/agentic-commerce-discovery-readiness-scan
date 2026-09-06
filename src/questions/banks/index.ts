// Het register van vragenbanken.
//
// De meegeleverde banken zijn de terugval: ze houden de zelfbedieningsscan
// overeind voor een merchant die zomaar een feed uploadt terwijl er voor zijn
// markt nog geen onderzochte bank ligt. Ze zijn allemaal `provisional`.
//
// Een onderzochte bank komt er via `resolveBanks` bij en wint van de terugval
// zodra hij op dezelfde categorie matcht. Dat is de hele koppeling: de app
// bepaalt niet wat er in een bank staat, hij kiest alleen welke bank op welke
// categorie van toepassing is.

import type { QuestionBank } from '../bank';
import { GENERIC_BANK } from './generic';
import { APPAREL_BANK } from './apparel';
import { BIKE_TYRE_BANK } from './bike-tyres';
import { ELECTRONICS_BANK } from './electronics';
import { HOME_TEXTILES_BANK } from './home-textiles';

/** De volgorde is niet betekenisloos: de eerste match wint, het vangnet is laatst. */
export const BUILT_IN_BANKS: QuestionBank[] = [
  HOME_TEXTILES_BANK,
  APPAREL_BANK,
  BIKE_TYRE_BANK,
  ELECTRONICS_BANK,
  GENERIC_BANK,
];

export { GENERIC_BANK, APPAREL_BANK, BIKE_TYRE_BANK, ELECTRONICS_BANK, HOME_TEXTILES_BANK };

/**
 * De banken waaruit gekozen wordt, met de ingelezen banken vooraan.
 *
 * Vooraan en niet achteraan: een bank die uit de methode komt — met panel, met
 * domeinreview, bevroren — hoort te winnen van de terugval die wij meebrengen.
 * Anders zou onderzoek doen niets veranderen aan de uitkomst.
 */
export function resolveBanks(imported: QuestionBank[] = []): QuestionBank[] {
  return [...imported, ...BUILT_IN_BANKS];
}

/**
 * De bank die bij deze categorienaam hoort.
 *
 * Zonder match is een bank het vangnet. Is er meer dan één vangnet, dan wint het
 * eerste; dat is de ingelezen bank zodra die er is.
 */
export function bankFor(category: string, banks: QuestionBank[]): QuestionBank {
  for (const bank of banks) {
    if (!bank.meta.match) continue;
    if (new RegExp(bank.meta.match, 'i').test(category)) return bank;
  }
  return banks.find((bank) => !bank.meta.match) ?? GENERIC_BANK;
}
