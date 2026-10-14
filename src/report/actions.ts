// Wat een retailer met de uitkomst moet doen, afgeleid uit de scan.
//
// Dit is de inhoud van de pdf: alleen bevindingen en verbeteringen, geen uitleg
// over de meting. Een rij is altijd een handeling — een kolom invullen, een
// kenmerk toevoegen, een antwoord op de website zetten — met wat het oplevert.
//
// De winst van een actie wordt uitgerekend en niet geschat: per product staat in
// de scan welke kritieke vragen openstaan en welke velden ze missen. Een product
// wordt basisgeschikt door een actie als élke kritieke vraag die openstaat alleen
// op de velden van die actie wacht.
//
// Lijsten worden hier niet ingekort. Wat een retailer moet doen, staat er
// helemaal.
//
// Puur: alles komt binnen als argument.

import type { Bilingual, Locale, ScanReport } from '../domain/types';
import type { AttributeExample } from '../questions/bank';
import { isStockQuestion, type SiteAnswerStatus, type SiteCheck } from '../collect/answers';
import type { SupportList } from '../questions/support';
import { advisoryItems, categoryLabel } from './derive';
import { modelFromReport } from './model';

const WEIGHT: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface FillRow {
  /** De velden van de scan; één actie kan twee kolommen dragen die dezelfde vragen openhouden. */
  fields: string[];
  /** De kolomnamen zoals de retailer ze kent. */
  columns: string[];
  /** Bij hoeveel producten de kolom leeg staat. */
  empty: number;
  questions: string[];
  critical: boolean;
  /** Producten die basisgeschikt worden als deze kolommen gevuld zijn. */
  gain: number;
  expect?: { kind?: string; unit?: string };
  own: string[];
  examples: AttributeExample[];
}

export interface AddRow {
  key: string;
  label: string;
  /** Bij hoeveel producten een vraag op dit kenmerk nog openstaat. */
  products: number;
  /** Producten die basisgeschikt worden als dit kenmerk er is. */
  gain: number;
  critical: boolean;
  questions: string[];
  /** Hoe een onderzochte winkel het invult, met de pagina waar het staat. */
  examples: AttributeExample[];
  expect?: { kind?: string; unit?: string };
  importance: string;
}

export interface CategoryLine {
  label: string;
  total: number;
  qualified: number;
  answered: number;
  applicable: number;
  /** Het grootste gat in deze categorie, met wat ermee moet. */
  first?: { label: string; cause: 'unfilled' | 'unmodelled' | 'no-source' };
}

export interface SiteLine {
  id: string;
  label: string;
  status: Exclude<SiteAnswerStatus, 'answered' | 'not-checked'>;
  mails?: number;
  group?: string;
}

export interface ReadinessPlan {
  total: number;
  qualified: number;
  avgAnswered: number;
  avgApplicable: number;
  complete: number;
  /** De website: hoeveel van de getoetste vragen hij beantwoordt. */
  site?: { site: string; checkedAt: string; pages: number; answered: number; checked: number };
  fill: FillRow[];
  /** Kenmerken die de catalogus mist en die zwaar wegen: kritiek of hoog. */
  add: AddRow[];
  /** De rest van de ontbrekende kenmerken. */
  addLater: AddRow[];
  categories: CategoryLine[];
  /** Klantvragen die de site niet of half beantwoordt, het vaakst gemaild eerst. */
  siteSupport: SiteLine[];
  /** Vragen uit de bank die de site niet of half beantwoordt. */
  siteBank: SiteLine[];
  /** Voorbeeldvragen voor de uitleg van kritiek en overig, uit de bank zelf. */
  exampleCritical?: string;
  exampleOther?: string;
  unmatched: number;
  banks: { label: Bilingual; version: string; status: string }[];
}

/** Hoeveel producten basisgeschikt worden als precies deze velden gevuld zijn. */
function gainOf(report: ScanReport, fields: Set<string>): number {
  let gain = 0;
  for (const product of report.products) {
    if (product.qualified || product.unmatched || product.facetOnly) continue;
    const open = product.questions.filter((question) => question.scored && question.importance === 'critical' && !question.answered);
    if (open.length === 0) continue;
    if (open.every((question) => question.missing.length > 0 && question.missing.every((field) => fields.has(field)))) gain += 1;
  }
  return gain;
}

export function readinessPlan(report: ScanReport, locale: Locale, siteCheck?: SiteCheck, support?: SupportList): ReadinessPlan {
  const model = modelFromReport(report, locale, '', { gapLimit: Number.MAX_SAFE_INTEGER });

  // --- Invullen: kolommen die er zijn maar leeg staan ------------------------
  // Twee kolommen die precies dezelfde vragen openhouden zijn één actie: wie
  // alleen de ene vult, beantwoordt niets.
  const groups = new Map<string, FillRow>();
  for (const gap of model.gaps.filter((row) => row.cause === 'unfilled')) {
    const blocked = gap.blocked ?? [];
    const key = blocked.map((question) => question.questionId).sort().join('|') || gap.field;
    const held = groups.get(key);
    if (held) {
      held.fields.push(gap.field);
      held.columns.push(gap.label[locale]);
      held.empty = Math.max(held.empty, gap.affected);
      held.own.push(...(gap.ownExamples ?? []).filter((value) => !held.own.includes(value)));
      continue;
    }
    groups.set(key, {
      fields: [gap.field],
      columns: [gap.label[locale]],
      empty: gap.affected,
      questions: blocked.map((question) => question.label[locale]),
      critical: blocked.some((question) => question.importance === 'critical'),
      gain: 0,
      expect: gap.expect
        ? { kind: gap.expect.shape?.kind ?? (gap.expect.answerType === 'enum' ? 'list' : gap.expect.answerType), unit: gap.expect.shape?.unit }
        : undefined,
      own: [...(gap.ownExamples ?? [])],
      examples: gap.expect?.examples ?? [],
    });
  }
  const fill = [...groups.values()]
    .map((row) => ({ ...row, gain: row.critical ? gainOf(report, new Set(row.fields)) : 0 }))
    .sort((a, b) => b.gain - a.gain || b.empty - a.empty);

  // --- Toevoegen: kenmerken die de catalogus niet heeft ----------------------
  const perQuestion = new Map<string, { label: string; importance: string; applicable: number; open: number; keys: Set<string> }>();
  const fieldsOf = new Map<string, Set<string>>();
  const examplesOf = new Map<string, AttributeExample[]>();
  const expectOf = new Map<string, { kind?: string; unit?: string }>();
  for (const row of report.questionCoverage) {
    if (!row.scored) continue;
    const held = perQuestion.get(row.questionId) ?? { label: row.label[locale], importance: row.importance, applicable: 0, open: 0, keys: new Set<string>() };
    held.applicable += row.applicable;
    held.open += row.applicable - row.answered;
    if ((WEIGHT[row.importance] ?? 9) < (WEIGHT[held.importance] ?? 9)) held.importance = row.importance;
    for (const hint of row.evidence ?? []) {
      held.keys.add(hint.attributeKey);
      const fields = fieldsOf.get(hint.attributeKey) ?? new Set<string>();
      for (const field of hint.fields) fields.add(field);
      fieldsOf.set(hint.attributeKey, fields);
      if (hint.examples?.length && !examplesOf.has(hint.attributeKey)) examplesOf.set(hint.attributeKey, hint.examples);
      const kind = hint.shape?.kind ?? (hint.answerType === 'enum' ? 'list' : hint.answerType);
      if (kind && !expectOf.has(hint.attributeKey)) expectOf.set(hint.attributeKey, { kind, unit: hint.shape?.unit });
    }
    perQuestion.set(row.questionId, held);
  }
  const missingKeys = new Map<string, string>(report.stamp.blindAttributes.map((attribute) => [attribute.key, attribute.label[locale]]));
  const addAll: AddRow[] = [];
  for (const [key, label] of missingKeys) {
    // Alleen vragen die nog openstaan: wat de categorieboom al beantwoordt, hoeft niet.
    const questions = [...perQuestion.values()].filter((question) => question.keys.has(key) && question.open > 0);
    if (questions.length === 0) continue;
    const importance = questions.map((question) => question.importance).sort((a, b) => (WEIGHT[a] ?? 9) - (WEIGHT[b] ?? 9))[0];
    const labels = [...new Set(questions.map((question) => question.label))];
    const critical = importance === 'critical';
    addAll.push({
      key, label, products: Math.max(...questions.map((question) => question.open)), questions: labels, importance, critical,
      examples: examplesOf.get(key) ?? [],
      ...(expectOf.has(key) ? { expect: expectOf.get(key) } : {}),
      gain: critical ? gainOf(report, fieldsOf.get(key) ?? new Set<string>()) : 0,
    });
  }
  addAll.sort((a, b) => (WEIGHT[a.importance] ?? 9) - (WEIGHT[b.importance] ?? 9) || b.products - a.products);
  const heavy = (row: AddRow) => row.importance === 'critical' || row.importance === 'high';

  // --- Per categorie ----------------------------------------------------------
  // De eerste actie in een categorie: wat basisgeschikt tegenhoudt als daar nog
  // werk ligt, anders het grootste gat. Een categorie op 0% basisgeschikt met als
  // eerste actie een wasvoorschrift zou de retailer de verkeerde kant op sturen.
  const criticalFirst = (setId: string): CategoryLine['first'] | undefined => {
    const open = report.questionCoverage
      .filter((row) => row.setId === setId && row.scored && row.importance === 'critical' && row.applicable > row.answered)
      .sort((a, b) => (b.applicable - b.answered) - (a.applicable - a.answered))[0];
    const hint = open?.evidence?.[0];
    if (!open || !hint) return undefined;
    const gap = report.gaps.find((one) => hint.fields.includes(one.field));
    return { label: gap?.cause === 'unfilled' ? gap.label[locale] : hint.label[locale], cause: gap?.cause ?? 'unmodelled' };
  };
  const categories: CategoryLine[] = report.categories
    .map((row) => {
      const top = row.topGaps[0];
      const first = (row.qualified < row.total ? criticalFirst(row.setId) : undefined)
        ?? (top ? { label: top.label[locale], cause: top.cause } : undefined);
      return {
        label: categoryLabel(row),
        total: row.total,
        qualified: row.qualified,
        answered: row.all.answered,
        applicable: row.all.total,
        ...(first ? { first } : {}),
      };
    })
    .sort((a, b) => b.total - a.total);

  // --- Website ----------------------------------------------------------------
  const answerOf = new Map((siteCheck?.answers ?? []).map((answer) => [answer.questionId, answer]));
  const advisory = advisoryItems(report, locale).filter((item) => !isStockQuestion(item.label));
  const supportQuestions = (support?.questions ?? []).filter((question) => !isStockQuestion(question.question) && !question.match?.scored);
  const open = (status?: SiteAnswerStatus): status is 'not-found' | 'partial' => status === 'not-found' || status === 'partial';

  const listed = new Set<string>();
  const siteSupport: SiteLine[] = supportQuestions
    .flatMap((question): SiteLine[] => {
      const id = question.match ? question.match.questionId : question.id;
      const status = answerOf.get(id)?.status;
      if (!open(status)) return [];
      listed.add(id);
      return [{ id, label: question.question, status, mails: question.count, group: question.group ?? question.theme }];
    })
    .sort((a, b) => (b.mails ?? 0) - (a.mails ?? 0));

  const seenLabel = new Set(siteSupport.map((line) => line.label));
  const siteBank: SiteLine[] = advisory.flatMap((item): SiteLine[] => {
    const status = answerOf.get(item.id)?.status;
    if (!open(status) || listed.has(item.id) || seenLabel.has(item.label)) return [];
    seenLabel.add(item.label);
    return [{ id: item.id, label: item.label, status }];
  });

  const checkedIds = new Set([...advisory.map((item) => item.id), ...supportQuestions.map((question) => question.id)]);
  const checked = (siteCheck?.answers ?? []).filter((answer) => checkedIds.has(answer.questionId) && answer.status !== 'not-checked' && answer.skipped !== 'stock');

  // --- Voorbeelden voor de uitleg ----------------------------------------------
  const byReach = [...perQuestion.values()].sort((a, b) => b.applicable - a.applicable);

  return {
    total: report.funnel.total,
    qualified: report.funnel.qualified,
    avgAnswered: report.funnel.avgAnswered,
    avgApplicable: report.funnel.avgApplicable,
    complete: report.funnel.findable,
    ...(siteCheck ? {
      site: {
        site: siteCheck.site,
        checkedAt: siteCheck.checkedAt,
        pages: siteCheck.pages.length,
        answered: checked.filter((answer) => answer.status === 'answered').length,
        checked: checked.length,
      },
    } : {}),
    fill,
    add: addAll.filter(heavy),
    addLater: addAll.filter((row) => !heavy(row)),
    categories,
    siteSupport,
    siteBank,
    exampleCritical: byReach.find((question) => question.importance === 'critical')?.label,
    exampleOther: byReach.find((question) => question.importance === 'low' || question.importance === 'medium')?.label,
    unmatched: report.unmatchedCount,
    banks: report.stamp.banks.map((bank) => ({ label: bank.label, version: bank.version, status: bank.status })),
  };
}

/** De vijf acties met de meeste winst: eerst wat basisgeschikt oplevert, dan wat de meeste producten raakt. */
export type TopAction =
  | { kind: 'fill'; row: FillRow }
  | { kind: 'add'; row: AddRow }
  | { kind: 'site'; groups: { name: string; mails: number }[]; mails: number; questions: number };

export function topActions(plan: ReadinessPlan, limit = 5): TopAction[] {
  const site = siteAction(plan);
  // Eerst wat producten basisgeschikt maakt, invullen vóór toevoegen; dan het
  // invulwerk dat de meeste producten raakt. Toevoegen zonder winst op de poort
  // staat op pagina twee, niet hier.
  const candidates: (TopAction & { gain: number; reach: number; order: number })[] = [
    ...plan.fill.map((row) => ({ kind: 'fill' as const, row, gain: row.gain, reach: row.empty, order: 0 })),
    ...plan.add.filter((row) => row.gain > 0).map((row) => ({ kind: 'add' as const, row, gain: row.gain, reach: row.products, order: 1 })),
  ];
  const picked = candidates
    .sort((a, b) => b.gain - a.gain || a.order - b.order || b.reach - a.reach)
    .slice(0, site ? limit - 1 : limit)
    .map(({ gain: _gain, reach: _reach, order: _order, ...action }) => action as TopAction);
  return site ? [...picked, site] : picked;
}

function siteAction(plan: ReadinessPlan): TopAction | undefined {
  const lines = [...plan.siteSupport, ...plan.siteBank];
  if (lines.length === 0) return undefined;
  // Het aantal mails staat per groep; elke groep telt één keer.
  const groups = new Map<string, number>();
  for (const line of plan.siteSupport) {
    if (line.group && line.mails !== undefined && !groups.has(line.group)) groups.set(line.group, line.mails);
  }
  const top = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, mails]) => ({ name, mails }));
  return { kind: 'site', groups: top, mails: top.reduce((sum, group) => sum + group.mails, 0), questions: lines.length };
}
