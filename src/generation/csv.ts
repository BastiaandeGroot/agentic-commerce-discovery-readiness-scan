// De vragenlijst als tabel, in de vorm die `src/questions/list.ts` inleest.
//
// Deterministisch en zonder model: op dit punt is alles al besloten en hoeft er
// alleen nog geschreven te worden. Een model dat een CSV uitschrijft is de
// duurste manier om een komma te zetten, en de enige die soms een kolom vergeet.
//
// De kolomnamen zijn de aliassen die de lezer kent. Niet de positie: de lezer
// werkt op naam, en een generator die op volgorde zou vertrouwen breekt zodra
// daar een kolom bij komt.

import type { DraftQuestion, LayerDraft, RunState } from './state';

/**
 * De kolommen, in vaste volgorde.
 *
 * `vraag_nl` en `vraag_en` allebei, want een lijst met één taal laat de app een
 * waarschuwing geven en toont straks Engelse vragen in een Nederlands rapport.
 */
const HEADER = [
  'id',
  'vraag_nl',
  'vraag_en',
  'laag',
  'categorie',
  'intentie',
  'belang',
  'dekking',
  'dekking_bronnen',
  'bron',
  'benodigde_attributen',
  'synoniemen',
  'modus',
  'beslisregel',
  'antwoordtype',
  'beantwoordbaar_uit_attributen',
  'herweging',
  'toelichting',
  'markt',
  'onomkeerbare_fout',
];

/** Eén veld, met aanhalingstekens zodra het een scheidingsteken draagt. */
function escape(value: string): string {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  return /[",;]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

/**
 * Lijstwaarden aan elkaar.
 *
 * Met een puntkomma en niet met een komma: de lezer splitst op allebei, maar een
 * komma in een veld dwingt aanhalingstekens af en dat maakt de tabel voor een
 * mens slechter leesbaar dan nodig.
 */
function joinList(values: string[]): string {
  return values.map((value) => value.replace(/[;,]/g, ' ').trim()).filter(Boolean).join('; ');
}

function row(
  question: DraftQuestion,
  layer: 'basis' | 'overlay',
  category: string,
  state: RunState,
  reweight: string,
): string {
  const cells = [
    question.id,
    question.questionNl,
    question.questionEn,
    layer,
    category,
    question.intent,
    question.importance,
    question.coverage === null || question.coverage === undefined ? '' : String(question.coverage),
    joinList(question.coverageSites),
    joinList(question.sources),
    joinList(question.evidence),
    joinList(question.synonyms),
    question.mode ?? '',
    question.rule ?? '',
    question.answerType,
    question.answerable,
    reweight,
    question.note ?? '',
    state.brief.vertical,
    state.shape?.irreversibleMistake ?? '',
  ];
  return cells.map((cell) => escape(String(cell ?? ''))).join(',');
}

/**
 * De hele bank als één tabel.
 *
 * De herweging van een overlay komt niet als eigen rij maar als kolom bij de
 * vraag die hij herweegt: een overlay mag herwegen en niet herschrijven, en een
 * eigen rij zou hetzelfde id twee keer in de lijst zetten — precies wat de lezer
 * als dubbele vraag afkeurt.
 */
export function toCsv(state: RunState): string {
  const lines = [HEADER.join(',')];

  for (const question of state.base?.questions ?? []) {
    const reweights = state.overlays
      .flatMap((overlay) =>
        overlay.reweight
          .filter((entry) => entry.id === question.id)
          .map((entry) => `${overlay.category}: ${entry.importance}`),
      );
    lines.push(row(question, 'basis', 'basis', state, joinList(reweights)));
  }

  for (const overlay of state.overlays) {
    for (const question of overlay.questions) {
      lines.push(row(question, 'overlay', overlay.category, state, ''));
    }
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Wat er aan de lijst mankeert, vóórdat hij de deur uit gaat.
 *
 * Dit is geen tweede poortcontrole — die staat serverzijdig in `deliver.ts` en
 * blijft daar, want de generatie hoort niet over haar eigen werk te oordelen.
 * Dit vangt alleen wat de lezer niet kan zien omdat het buiten de tabel valt:
 * een overlay zonder vragen, een herweging naar een vraag die niet bestaat.
 */
export function checkDraft(state: RunState): string[] {
  const findings: string[] = [];
  const baseIds = new Set((state.base?.questions ?? []).map((question) => question.id));

  if (baseIds.size === 0) findings.push('De basislaag leverde geen vragen op.');

  for (const overlay of state.overlays) {
    if (overlay.questions.length === 0 && overlay.reweight.length === 0) {
      findings.push(
        `De overlay ${overlay.category} stelt geen eigen vragen en herweegt niets. `
        + 'Dan is het dezelfde meting op minder producten en hoort hij geen eigen rij te krijgen.',
      );
    }
    for (const entry of overlay.reweight) {
      if (!baseIds.has(entry.id)) {
        findings.push(`${overlay.category} herweegt ${entry.id}, maar die basisvraag bestaat niet.`);
      }
    }
  }

  const ids = new Set<string>();
  for (const question of [...(state.base?.questions ?? []), ...state.overlays.flatMap((one) => one.questions)]) {
    if (ids.has(question.id)) findings.push(`Vraag-id ${question.id} komt meer dan één keer voor.`);
    ids.add(question.id);
    if (question.evidence.length === 0 && question.answerable !== 'false') {
      findings.push(`${question.id} noemt geen attributen maar geldt wel als beantwoordbaar.`);
    }
  }

  return findings;
}

/** De overlays die de lijst kent, zodat het beheerscherm kan tonen wat er staat. */
export function overlayNames(state: RunState): string[] {
  return state.overlays.map((overlay: LayerDraft) => overlay.category);
}
