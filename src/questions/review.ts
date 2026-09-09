// Wat er per vraag te beoordelen valt, zodat een mens er iets mee kan.
//
// Een lijst waarschuwingen over een hele bank — "26 beslisregels zonder bron" —
// is niet te beoordelen: je weet niet wélke vragen het betreft en dus niet
// waarnaar je moet kijken. Een beheerder beoordeelt vragen, geen tellingen.
//
// Hier komt daarom per vraag uit wat eraan mankeert, als code en niet als zin:
// de tekst hoort in `src/i18n/`, in beide talen.
//
// Puur: geen klok, geen opslag, geen DOM.

import { attributeIndex, ruleIndex, type QuestionBank } from './bank';
import type { Bilingual } from '../domain/types';

/**
 * Wat er aan een vraag mankeert.
 *
 * Op volgorde van hoe erg het is. `no-attributes` betekent dat de vraag nooit
 * beantwoord kan worden; `rule-without-source` dat er een drempel in staat die
 * niemand kan narekenen. Onderaan staat wat eerder een aantekening is dan een
 * gebrek.
 */
export type QuestionIssue =
  | 'no-attributes'
  | 'rule-without-source'
  | 'rule-not-computed'
  | 'critical-without-basis'
  | 'structure-question'
  | 'process-question';

/** Hoe zwaar een bevinding weegt bij het sorteren. Hoger is eerder in beeld. */
const WEIGHT: Record<QuestionIssue, number> = {
  'no-attributes': 50,
  'rule-without-source': 40,
  'critical-without-basis': 30,
  'rule-not-computed': 10,
  // Een structuurvraag is werk met waarde: het verband léggen is precies wat
  // deze scan hoort aan te wijzen. Een procesvraag is dat niet — daar kan geen
  // enkel veld ooit antwoord op geven — en die weegt daarom het lichtst.
  'structure-question': 15,
  'process-question': 1,
};

export interface ReviewedQuestion {
  id: string;
  label: Bilingual;
  /** De categorie waar hij bij hoort, of leeg bij een basisvraag. */
  category?: string;
  layer: 'base' | 'overlay';
  importance: string;
  /** De kenmerken die de vraag nodig heeft, met of ze op een veld uitkomen. */
  attributes: { key: string; mapped: boolean }[];
  /** Op hoeveel panelsites dit onderwerp voorkomt; null = niet onderzocht. */
  coverage: number | null;
  issues: QuestionIssue[];
  /** Optelsom van de gewichten; bepaalt de volgorde. */
  severity: number;
}

/** Komt dit veld uit de catalogus, of is het nog een zoekpatroon van ons? */
const isGuess = (field: string) => field.startsWith('attr:') && !field.startsWith('attr:^');

/**
 * De hele bank, vraag voor vraag, met het ergste bovenaan.
 *
 * Ook de vragen zonder bevinding komen mee. Een beheerder die alleen de
 * probleemgevallen ziet, weet niet wat hij vrijgeeft — en vrijgeven gaat over de
 * bank als geheel.
 */
/**
 * Wat er over de bank als geheel te zeggen valt.
 *
 * Twee dingen stonden eerder bij élke vraag: "dekking niet onderzocht" en
 * "kenmerken komen op geen kolom uit". Een bevinding die overal staat helpt
 * nergens kiezen — hij maakt de lijst alleen onleesbaar. En de tweede gaat niet
 * eens over de bank maar over een stap die daarna komt: kolomnamen horen bij één
 * winkel, een bank bij een markt.
 */
export interface BankSummary {
  questions: number;
  /** Hoeveel vragen een onderzochte dekking dragen. */
  withCoverage: number;
  /** Het panel waarop de dekking rust, voor zover de vragen dat noemen. */
  panelSize: number;
  attributes: number;
  attributesMapped: number;
}

export function summariseBank(bank: QuestionBank): BankSummary {
  const questions = [...bank.questions, ...bank.overlays.flatMap((o) => o.questions ?? [])];
  const attributes = [...bank.attributes, ...bank.overlays.flatMap((o) => o.attributes ?? [])];
  const sites = new Set<string>();
  for (const question of questions) for (const site of question.coverageSites ?? []) sites.add(site);
  return {
    questions: questions.length,
    withCoverage: questions.filter((q) => q.coverage !== null && q.coverage !== undefined).length,
    panelSize: sites.size,
    attributes: attributes.length,
    attributesMapped: attributes.filter((a) => (a.evidence ?? []).some((f) => !isGuess(f))).length,
  };
}

export function reviewBank(bank: QuestionBank): ReviewedQuestion[] {
  const rules = ruleIndex(bank);
  const out: ReviewedQuestion[] = [];

  const walk = (
    questions: QuestionBank['questions'],
    layer: 'base' | 'overlay',
    category: string | undefined,
    attributes: ReturnType<typeof attributeIndex>,
  ) => {
    for (const question of questions) {
      const issues: QuestionIssue[] = [];

      const used = (question.evidence ?? []).map((key) => {
        const attribute = attributes.get(key);
        const fields = attribute?.evidence ?? [];
        return { key, mapped: fields.some((field) => !isGuess(field)) };
      });

      if (used.length === 0) issues.push('no-attributes');

      if (question.ruleId) {
        const rule = rules.get(question.ruleId);
        // Een drempel op naam van de markt die niemand kan narekenen is het
        // ergste wat een bank kan dragen: hij ziet eruit als een feit.
        if (!rule || rule.source.kind !== 'published') issues.push('rule-without-source');
        else issues.push('rule-not-computed');
      }

      // Kritiek hoort te volgen uit de onomkeerbare fout. Staat die nergens en
      // draagt de vraag ook geen dekking, dan is "kritiek" een mening.
      if (question.importance === 'critical'
        && (question.coverage === null || question.coverage === undefined)
        && !bank.context?.irreversibleMistake) {
        issues.push('critical-without-basis');
      }

      // Twee heel verschillende dingen onder één noemer, en dat verschil is
      // het punt. Een procesvraag ("kan ik een staal krijgen") kan geen enkel
      // veld ooit beantwoorden; elke merchant zakt daar identiek op en dus meet
      // hij niets. Een structuurvraag ("welke kleuren bestaan er nog meer in
      // deze kwaliteit") is wél uit data te beantwoorden — alleen vraagt hij een
      // verband dat de catalogus niet legt, en dát is een aanbeveling.
      if (question.answerable === 'no') {
        issues.push(question.answerType === 'process' ? 'process-question' : 'structure-question');
      }

      out.push({
        id: question.id,
        label: question.label,
        category,
        layer,
        importance: question.importance,
        attributes: used,
        coverage: question.coverage ?? null,
        issues,
        severity: issues.reduce((total, issue) => total + WEIGHT[issue], 0),
      });
    }
  };

  walk(bank.questions, 'base', undefined, attributeIndex(bank));
  for (const overlay of bank.overlays) {
    walk(overlay.questions ?? [], 'overlay', overlay.label.nl, attributeIndex(bank, overlay));
  }

  // Ergste bovenaan, en binnen dezelfde ernst op id zodat de volgorde vastligt.
  return out.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
}
