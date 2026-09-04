// Van vragenbank naar vragenset: de basislaag met de overlay eroverheen.
//
// De methode schrijft drie lagen voor en waarschuwt dat je achteraf nooit meer
// splitst. De basislaag geldt voor élk product in de vertical; de overlay voegt
// toe wat categoriespecifiek is en mag basisvragen **herwegen** of uitschakelen,
// maar niet herschrijven. Zou herschrijven wel mogen, dan lopen dezelfde vragen
// tussen categorieën uit de pas en is de bank geen meetinstrument meer maar een
// verzameling losse lijstjes.
//
// Deze module is puur: geen klok, geen IO. Dezelfde bank en dezelfde categorie
// geven altijd dezelfde set.

import type { Question, QuestionSet, RequirementGroup } from '../domain/types';
import type { AttributeDef, BankQuestion, Overlay, QuestionBank } from './bank';
import { attributeIndex, IMPORTANCE_WEIGHT } from './bank';

/**
 * Het gewicht van een zelf toegevoegde vraag.
 *
 * Middel en niet hoog: de merchant heeft hem niet voor niets toegevoegd, maar
 * hij is niet door het panel gegaan en niet door de domeinreview. Hem meteen
 * kritiek maken zou zijn eigen oordeel boven de methode zetten.
 */
export const CUSTOM_IMPORTANCE = 'medium' as const;

/** De overlay die bij deze categorienaam hoort, of geen. */
export function overlayFor(bank: QuestionBank, category: string): Overlay | undefined {
  for (const overlay of bank.overlays) {
    if (new RegExp(overlay.match, 'i').test(category)) return overlay;
  }
  return undefined;
}

/** De toepassingsprofielen die op deze categorie van toepassing zijn. */
export function profilesFor(overlay: Overlay | undefined, category: string): string[] {
  return (overlay?.profiles ?? [])
    .filter((profile) => !profile.match || new RegExp(profile.match, 'i').test(category))
    .map((profile) => profile.id);
}

/** Zet één attribuut om in de velden die het in een feed kunnen dragen. */
function groupFor(attribute: AttributeDef): RequirementGroup {
  return {
    attributeKey: attribute.key,
    label: attribute.label,
    fields: attribute.evidence,
    mode: attribute.mode ?? 'any',
  };
}

/**
 * Zet één bankvraag om in een vraag zoals de motor hem kent.
 *
 * Een attribuut waarvoor de bank geen enkel veld noemt levert een lege groep op.
 * Die laten we staan in plaats van hem weg te filteren: een vraag die op zo'n
 * attribuut leunt is per definitie onbeantwoordbaar uit de feed, en dát is de
 * bevinding. Stil weglaten zou het gat wegpoetsen.
 */
export function toQuestion(
  question: BankQuestion,
  attributes: Map<string, AttributeDef>,
  importance = question.importance,
): Question {
  const evidence = question.evidence.map((key) => {
    const attribute = attributes.get(key);
    if (attribute) return groupFor(attribute);
    return { attributeKey: key, label: { nl: key, en: key }, fields: [], mode: 'any' as const };
  });

  return {
    id: question.id,
    label: question.label,
    mode: question.mode,
    // Platgeslagen weergave: voor de gaptoewijzing en de regel "Nodig: …" op het
    // scherm. Het antwoord zelf komt uit `evidence`, dat de twee lagen bewaart.
    requires: [...new Set(evidence.flatMap((group) => group.fields))],
    evidence,
    origin: 'bank',
    importance,
    intent: question.intent,
    coverage: question.coverage,
    answerable: question.answerable,
    ruleId: question.ruleId,
    weightNote: question.weightNote,
  };
}

/** Telt deze vraag mee in de trechter? */
export function isScored(question: Question): boolean {
  return question.answerable !== 'no';
}

/** Het gewicht van een vraag; 0 zodra hij buiten de score valt of uitstaat. */
export function weightOf(question: Question): number {
  if (question.disabled || !isScored(question)) return 0;
  return IMPORTANCE_WEIGHT[question.importance ?? CUSTOM_IMPORTANCE];
}

/**
 * Stel de vragen samen voor één categorie: basislaag, overlay eroverheen.
 *
 * Volgorde: eerst de basisvragen in hun eigen volgorde, daarna de
 * categoriespecifieke. Zo herkent iemand die twee categorieën naast elkaar legt
 * de gedeelde kop, en dat is precies waar de laagopzet voor bedoeld is.
 */
export function composeQuestions(bank: QuestionBank, overlay?: Overlay): Question[] {
  const attributes = attributeIndex(bank, overlay);
  const suppressed = new Set(overlay?.suppress ?? []);

  const base = bank.questions
    .filter((question) => !suppressed.has(question.id))
    .map((question) => {
      const reweight = overlay?.reweight?.[question.id];
      const composed = toQuestion(question, attributes, reweight?.importance ?? question.importance);
      // De verantwoording van de herweging hoort bij de vraag, niet in een
      // losse tabel: wie zich afvraagt waarom deze vraag hier zwaarder weegt,
      // kijkt naar de vraag.
      return reweight?.why ? { ...composed, weightNote: reweight.why } : composed;
    });

  const extra = (overlay?.questions ?? []).map((question) => toQuestion(question, attributes));
  return [...base, ...extra];
}

/**
 * De volledige vragenset voor één categorie van deze merchant.
 *
 * `match` wordt op de exacte categorienaam geankerd. De set gaat dus over zijn
 * indeling en niet over de onze — anders meten we onze categorieboom in plaats
 * van zijn catalogus.
 */
export function composeSet(
  bank: QuestionBank,
  category: { id: string; name: string; count: number },
): QuestionSet {
  const overlay = overlayFor(bank, category.name);
  return {
    id: category.id,
    label: { nl: category.name, en: category.name },
    match: `^${category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
    category: category.name,
    productCount: category.count,
    questions: composeQuestions(bank, overlay),
    validated: false,
    bankId: bank.meta.vertical,
    bankVersion: bank.meta.version,
    bankStatus: bank.meta.status,
    overlayId: overlay?.id,
    profileIds: profilesFor(overlay, category.name),
  };
}
