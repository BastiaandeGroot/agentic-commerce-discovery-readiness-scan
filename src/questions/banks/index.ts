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

/** Slaat deze bank op deze categorie? */
function matches(bank: QuestionBank, category: string): boolean {
  if (bank.meta.match && new RegExp(bank.meta.match, 'i').test(category)) return true;
  // Ook zonder `match` op de bank telt een overlay die op de categorie slaat:
  // die draagt zijn categorienaam al.
  return bank.overlays.some((overlay) => new RegExp(overlay.match, 'i').test(category));
}

/**
 * De bank die bij deze categorienaam hoort.
 *
 * Onderzochte banken gaan vóór de meegeleverde, en niet alleen bij een treffer.
 * Zou een meegeleverde bank een ingelezen bank met een regex kunnen verslaan,
 * dan meet een merchant die net een vragenlijst aanleverde alsnog langs onze
 * terugval — en dan levert aanleveren niets op. Pas als er helemaal geen
 * ingelezen bank is, komt de terugval in beeld.
 */
export function bankFor(category: string, banks: QuestionBank[]): QuestionBank {
  const imported = banks.filter((bank) => bank.meta.origin === 'imported');
  const builtIn = banks.filter((bank) => bank.meta.origin !== 'imported');

  const hit = imported.find((bank) => matches(bank, category));
  if (hit) return hit;
  // Een ingelezen bank die op géén enkele categorie matcht, wint nog steeds van
  // de terugval. Zijn categorienamen kunnen in een andere taal staan dan de boom
  // van de merchant — een Engelse vragenlijst op een Nederlandse catalogus is
  // het normale geval geworden — en dan zou stil terugvallen betekenen dat de
  // merchant een rapport krijgt langs een lat die hij niet aanleverde, terwijl
  // hij denkt dat zijn eigen lijst gebruikt wordt. Hij krijgt dan de basislaag
  // zonder overlay, en `categoriesWithoutOverlay` zegt dat hardop.
  if (imported.length > 0) return imported[0];

  const builtInHit = builtIn.find((bank) => matches(bank, category));
  if (builtInHit) return builtInHit;
  return builtIn.find((bank) => !bank.meta.match) ?? GENERIC_BANK;
}
