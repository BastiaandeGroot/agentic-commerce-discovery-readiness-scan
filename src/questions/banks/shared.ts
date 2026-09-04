// Bouwers voor de meegeleverde banken.
//
// Deze banken zijn **voorlopig**, en dat is geen slag om de arm maar een
// eigenschap. De methode vraagt een panel van vijf tot acht sites, een oogst per
// bron, een domeinreview en daarna bevriezen. Dat is handwerk per vertical, en
// het gebeurt buiten de app. Wat hier staat is de terugval voor een merchant die
// zomaar een feed uploadt terwijl er voor zijn markt nog geen bank ligt.
//
// Daarom staat overal `coverage: null` en niet `coverage: 0`. Die twee lijken op
// elkaar en zijn tegengesteld: nul betekent dat geen enkele panelsite dit
// onderwerp behandelt — een vondst, en volgens de methode juist commercieel
// interessant. Null betekent dat er nooit gemeten is. Ze mogen niet samenvallen.
//
// Om dezelfde reden dragen deze banken geen beslisregels. Een drempel zonder
// bron is volgens de methode de snelste manier om vertrouwen te verliezen bij de
// domeinexpert, en een verzonnen getal op naam van een site is erger dan geen
// getal. De regels komen uit fase 2, met de site erbij.

import type {
  AttributeDef, BankQuestion, EvidenceSource, Importance, Intent, QuestionBank,
} from '../bank';
import type { Bilingual } from '../../domain/types';

/** Elke vraag in een voorlopige bank komt uit vakkennis, niet uit een panel. */
const EXPERTISE: EvidenceSource[] = ['expertise'];

export function attribute(
  key: string,
  label: Bilingual,
  evidence: string[],
  extra: Partial<AttributeDef> = {},
): AttributeDef {
  return { key, label, type: 'text', level: 'product', evidence, ...extra };
}

export function question(
  id: string,
  label: Bilingual,
  evidence: string[],
  importance: Importance,
  intent: Intent,
  extra: Partial<BankQuestion> = {},
): BankQuestion {
  return {
    id,
    label,
    intent,
    importance,
    coverage: null,
    sources: EXPERTISE,
    evidence,
    mode: 'all',
    answerType: 'text',
    answerable: 'yes',
    ...extra,
  };
}

/**
 * De aantekening die elke voorlopige bank draagt.
 *
 * Staat in het rapport, niet alleen in de code. Een merchant hoort te weten dat
 * zijn vragen uit een terugval komen en niet uit onderzoek naar zijn markt —
 * anders leest een voorlopig cijfer als een gemeten cijfer.
 */
export const PROVISIONAL_NOTE: Bilingual = {
  nl: 'Deze vragen komen uit vakkennis, niet uit onderzoek naar jouw markt. Er is geen sitepanel geraadpleegd, dus er staat geen dekking bij en er zijn geen beslisregels. Zodra er een onderzochte vragenbank voor deze vertical ligt, vervangt die deze set.',
  en: 'These questions come from domain knowledge, not from research into your market. No site panel was consulted, so there is no coverage figure and there are no decision rules. As soon as a researched question bank exists for this vertical, it replaces this set.',
};

/** Het open punt dat elke voorlopige bank draagt: het onderzoek zelf. */
export function pendingResearch(vertical: string) {
  return {
    id: `${vertical}-panel`,
    kind: 'gap' as const,
    weight: 'critical' as const,
    question: {
      nl: 'Welke vragen stelt een koper in deze markt werkelijk? Dit vraagt een panel van vijf tot acht sites, een bronoogst per site en een domeinreview. Tot die er is, weegt deze bank op vakkennis.',
      en: 'What does a buyer in this market actually ask? This requires a panel of five to eight sites, a source harvest per site and a domain review. Until that exists, this bank rests on domain knowledge.',
    },
  };
}

/** Een voorlopige bank: geen panel, geen bevriezing, wel navolgbaar. */
export function provisional(
  bank: Omit<QuestionBank, 'meta'> & { meta: Omit<QuestionBank['meta'], 'panel' | 'status' | 'origin'> },
): QuestionBank {
  return {
    ...bank,
    meta: { ...bank.meta, panel: [], status: 'provisional', origin: 'built-in' },
    openPoints: [...(bank.openPoints ?? []), pendingResearch(bank.meta.vertical)],
    transparencyNotes: [...(bank.transparencyNotes ?? []), PROVISIONAL_NOTE],
  };
}
