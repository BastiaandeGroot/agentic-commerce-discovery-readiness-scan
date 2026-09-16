// Wanneer een vraag kritiek is.
//
// Kritiek is de eerste trede van de trechter: basisgeschikt betekent élke
// kritieke vraag beantwoord. Dat werkt alleen als het een smalle poort is. De
// eerste echte bank maakte er 31 van de 171 vragen kritiek, en na de herweging
// per categorie tot een derde per categorie. De maat was "voorkomt de fout die de
// koper niet kan terugdraaien", en in een markt waar alles op maat geknipt wordt
// is élke verkeerde keuze onomkeerbaar — dus haalde bijna alles die lat.
//
// Daarom een toets van vier vragen, en een vraag is alleen kritiek als ze alle
// vier met ja beantwoord worden:
//
//   1. Beslissend  — maakt een fout antwoord het product ongeschikt voor wat de
//                    koper ermee wil (verkeerde hoeveelheid, ongeschikt voor de
//                    toepassing, niet toegestaan of onveilig)? Tegenvallen telt niet.
//   2. Onherstelbaar — kan de koper het na levering niet terugdraaien, omdat het
//                    geknipt, verwerkt of aangebracht is, of retour uitgesloten is?
//   3. Over het product — gaat de vraag over een eigenschap van het product, en
//                    niet over beleid, levering of voorraad?
//   4. Uit de catalogus — staat het antwoord in een kenmerk van het product zelf,
//                    en is het geen berekening die maten of keuzes van de koper
//                    nodig heeft?
//
// Het vierde kwam erbij na de eerste correctie op een echte bank. "Hoeveel meter
// heb ik nodig" is beslissend en onherstelbaar, maar vraagt rolbreedte, rapport,
// krimpmarge en de maten van de koper tegelijk; geen enkel product in de
// catalogus beantwoordde hem, en als poort zette hij basisgeschikt van 1.523 op
// 136. Een poort die niemand kan halen meet niets meer — hij verbergt elke andere
// kritieke vraag. Zo'n rekenvraag blijft in de meting, als hoog.
//
// De eerste twee vragen oordeel: dat doet de generatie per vraag, en een
// beheerder kan het corrigeren. De laatste twee zijn na te gaan uit wat de bank
// al zegt, en die past deze module zelf toe — zie `enforceCriticalCriteria`.
//
// Puur: geen klok, geen opslag.

import type { BankQuestion, Importance, QuestionBank } from './bank';

/** De drie criteria, in de volgorde waarin ze gesteld worden. */
export const CRITICAL_CRITERIA = ['decisive', 'irreversible', 'product', 'catalogue'] as const;

/**
 * Gaat deze vraag over iets anders dan het product?
 *
 * Een procesvraag ("kan ik een staal krijgen"), een vraag die uit geen enkel
 * kenmerk te beantwoorden is, en een vraag naar koopzekerheid ("kan ik
 * retourneren", "kan ik later bijbestellen") gaan over beleid, levering of
 * voorraad. Die kunnen advies dragen, maar geen poort zijn: of een product
 * basisgeschikt is, hangt niet af van het retourbeleid van de winkel.
 */
export function failsProductCriterion(question: Pick<BankQuestion, 'intent' | 'answerType' | 'answerable'>): boolean {
  return question.intent === 'purchase-certainty'
    || question.answerType === 'process'
    || question.answerable === 'no';
}

/**
 * Is het antwoord een berekening in plaats van een kenmerk?
 *
 * Antwoordtype `afgeleid`: de catalogus levert de invoer — breedte, rapport,
 * krimp — maar het antwoord ontstaat pas met de maten of keuzes van de koper
 * erbij. Dat is waardevol om te meten, maar het kan geen poort zijn: een
 * catalogus die alles goed vastlegt, haalt hem nog steeds niet.
 */
export function failsCatalogueCriterion(question: Pick<BankQuestion, 'answerType'>): boolean {
  return question.answerType === 'derived';
}

/** Welk criterium een kritieke vraag niet haalt, of `undefined` als hij beide haalt. */
export function mechanicalFailure(
  question: Pick<BankQuestion, 'intent' | 'answerType' | 'answerable'>,
): 'product' | 'catalogue' | undefined {
  if (failsProductCriterion(question)) return 'product';
  if (failsCatalogueCriterion(question)) return 'catalogue';
  return undefined;
}

/** Kritiek wordt hoog; de rest blijft zoals het is. */
const lower = (importance: Importance): Importance => (importance === 'critical' ? 'high' : importance);

/**
 * Het derde en vierde criterium op een bank toepassen.
 *
 * Een kritieke vraag die niet over het product gaat, of waarvan het antwoord een
 * berekening is, wordt hoog — ook als een categorie haar herweegt tot kritiek.
 * Geeft per criterium terug welke id's het raakte, zodat de lezer het als
 * waarschuwing kan melden: een aanname van de lezer staat altijd in de uitkomst.
 */
export function enforceCriticalCriteria(bank: QuestionBank): {
  bank: QuestionBank;
  lowered: { product: string[]; catalogue: string[] };
} {
  const failed = new Map<string, 'product' | 'catalogue'>();
  const byId = new Map<string, BankQuestion>();

  const apply = (question: BankQuestion): BankQuestion => {
    byId.set(question.id, question);
    const failure = question.importance === 'critical' ? mechanicalFailure(question) : undefined;
    if (!failure) return question;
    failed.set(question.id, failure);
    return { ...question, importance: 'high' };
  };

  const questions = bank.questions.map(apply);
  const overlays = bank.overlays.map((overlay) => {
    const own = overlay.questions?.map(apply);
    let reweight = overlay.reweight;
    for (const [id, entry] of Object.entries(overlay.reweight ?? {})) {
      const question = byId.get(id);
      const failure = entry.importance === 'critical' && question ? mechanicalFailure(question) : undefined;
      if (!failure) continue;
      failed.set(`${overlay.id}/${id}`, failure);
      reweight = { ...reweight, [id]: { ...entry, importance: lower(entry.importance) } };
    }
    return { ...overlay, ...(own ? { questions: own } : {}), ...(reweight ? { reweight } : {}) };
  });

  const of = (kind: 'product' | 'catalogue') =>
    [...failed.entries()].filter(([, reason]) => reason === kind).map(([id]) => id).sort();
  return {
    bank: failed.size === 0 ? bank : { ...bank, questions, overlays },
    lowered: { product: of('product'), catalogue: of('catalogue') },
  };
}

/**
 * Wat een beheerder aan het belang corrigeerde, naast de bank bewaard.
 *
 * De sleutel is een vraag-id voor de vraag zelf, of `overlay-id/vraag-id` voor
 * de herweging van een basisvraag binnen één categorie. Los van de CSV, zoals een
 * overgeslagen vraag: terug te draaien zonder de bank te herschrijven, en de
 * id's blijven staan — daar hangt het werk van elke merchant aan.
 */
export type ImportanceCorrections = Record<string, Importance>;

export function applyImportanceCorrections(bank: QuestionBank, corrections: ImportanceCorrections): QuestionBank {
  if (Object.keys(corrections).length === 0) return bank;
  const apply = (question: BankQuestion): BankQuestion =>
    corrections[question.id] ? { ...question, importance: corrections[question.id] } : question;

  const corrected: QuestionBank = {
    ...bank,
    questions: bank.questions.map(apply),
    overlays: bank.overlays.map((overlay) => {
      let reweight = overlay.reweight;
      for (const [key, importance] of Object.entries(corrections)) {
        const [overlayId, questionId] = key.split('/');
        if (overlayId !== overlay.id || !questionId) continue;
        reweight = { ...reweight, [questionId]: { ...(reweight?.[questionId] ?? {}), importance } };
      }
      return {
        ...overlay,
        ...(overlay.questions ? { questions: overlay.questions.map(apply) } : {}),
        ...(reweight ? { reweight } : {}),
      };
    }),
  };
  // Ook een correctie maakt geen vraag over beleid of voorraad, en geen
  // rekenvraag, tot poort.
  return enforceCriticalCriteria(corrected).bank;
}
