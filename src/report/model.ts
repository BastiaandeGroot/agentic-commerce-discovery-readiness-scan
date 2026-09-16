// Wat het rapportscherm toont, in één vorm voor een verse scan én een bewaarde.
//
// Een bewaarde analyse draagt geen producten, en toch hoort hij er hetzelfde uit
// te zien als het rapport waar hij uit kwam. Twee schermen die elk hun eigen
// afleiding doen lopen uit elkaar; daarom bouwen beide bronnen dit model en
// tekent het scherm alleen het model. Wat een bron niet kan dragen staat als
// `undefined`, en het scherm laat dat deel dan weg in plaats van het te raden.
//
// Puur: geen DOM, geen klok.

import type { Average, Bilingual, Funnel, GapCause, Locale, ScanReport } from '../domain/types';
import type { ScanSnapshot } from '../engine/snapshot';
import { advisoryItems, mergedGaps, scoreRows, topBlockers, unansweredQuestions } from './derive';
import type { AdvisoryItem, Blocker } from './derive';

export interface ModelQuestion {
  setId: string;
  questionId: string;
  label: Bilingual;
  importance: string;
  layer?: 'base' | 'category';
  answered: number;
  applicable: number;
  empty: number;
  /** Los bekend bij een verse scan en een nieuwe snapshot. */
  unusable?: number;
  incomplete?: number;
  /** Alleen bij een oudere snapshot, die de twee samen bewaarde. */
  weak?: number;
  absent: number;
  evidence?: { attributeKey: string; label: Bilingual; fields: string[] }[];
  /**
   * Waarmee de beantwoorde producten beantwoord zijn: per kolom hoeveel. Onbekend
   * bij een bewaarde analyse zonder metingen of van vóór 16 september.
   */
  answeredBy?: { field: string; products: number }[];
  /** De beantwoorde producten zelf; alleen bij een verse scan, de opslag draagt ze niet. */
  answeredProducts?: { key: string; title?: string }[];
}

export interface ModelScoreRow {
  key: string;
  label: string;
  total: number;
  critical?: Average;
  general?: Average;
  all?: Average;
}

export interface ReportModel {
  funnel: Funnel;
  unmatchedCount: number;
  hasCritical: boolean;
  categories: { setId: string; category: string; subcategory?: string; total: number }[];
  scoreRows: ModelScoreRow[];
  /** Onbekend bij een oudere snapshot; dan staat de regel over niveaus er niet. */
  hasSubcategories?: boolean;
  /** Onbeantwoorde gescoorde vragen, beste eerst. Onbekend bij een oudere snapshot. */
  questions?: ModelQuestion[];
  blockers: {
    top: Blocker[];
    /** Onbekend bij een oudere snapshot: dat vraagt de producten. */
    wouldBecome?: number;
    nearest?: { open: number; products: number };
  };
  gaps: { field: string; label: Bilingual; cause: GapCause; affected: number; questions?: number }[];
  advisory: AdvisoryItem[];
  stamp: {
    scanVersion: string;
    fieldRegister: string;
    questionSetVersion: number;
    banks: { id: string; label?: Bilingual; version: string; status: string }[];
    blindAttributes: { key: string; label: Bilingual }[];
    scannedAt?: string;
  };
}

/**
 * Per vraag: welke kolommen de beantwoorde producten droegen, en welke producten.
 *
 * Op de voorste set van het product, zoals `questionCoverage`, zodat de aantallen
 * optellen tot wat er in de rij staat. Een product dat met twee kolommen
 * antwoordt, telt bij allebei.
 */
function answeredDetail(report: ScanReport): Map<string, { fields: Map<string, number>; products: { key: string; title?: string }[] }> {
  const out = new Map<string, { fields: Map<string, number>; products: { key: string; title?: string }[] }>();
  for (const product of report.products) {
    if (product.unmatched) continue;
    for (const question of product.questions) {
      if (!question.answered) continue;
      const id = `${product.setId}|${question.questionId}`;
      const entry = out.get(id) ?? { fields: new Map<string, number>(), products: [] };
      for (const field of question.found) entry.fields.set(field, (entry.fields.get(field) ?? 0) + 1);
      // Een rapport van een scan zonder producten (herberekend) heeft alleen
      // rijnummers als sleutel; die zeggen een merchant niets.
      if (!product.key.startsWith('#')) entry.products.push({ key: product.key, title: product.title });
      out.set(id, entry);
    }
  }
  return out;
}

export function modelFromReport(report: ScanReport, locale: Locale, allLabel: string): ReportModel {
  const detail = answeredDetail(report);
  const fresh = report.products.some((product) => !product.key.startsWith('#'));
  return {
    funnel: report.funnel,
    unmatchedCount: report.unmatchedCount,
    hasCritical: report.questionCoverage.some((row) => row.scored && row.importance === 'critical'),
    categories: report.categories,
    scoreRows: scoreRows(report, allLabel).map((row) => ({
      key: row.key, label: row.label, total: row.total, critical: row.critical, general: row.general, all: row.all,
    })),
    hasSubcategories: report.products.some((product) => product.subcategory !== undefined),
    questions: unansweredQuestions(report).map((row) => {
      const entry = detail.get(`${row.setId}|${row.questionId}`);
      const answeredBy = [...(entry?.fields ?? new Map<string, number>()).entries()]
        .map(([field, products]) => ({ field, products }))
        .sort((a, b) => b.products - a.products || a.field.localeCompare(b.field));
      return {
        ...row,
        // Beantwoord maar zonder dragende kolom: een herberekende analyse van
        // vóór het bewaren daarvan. Dan liever niets dan een lege lijst.
        answeredBy: row.answered > 0 && answeredBy.length === 0 ? undefined : answeredBy,
        answeredProducts: fresh ? entry?.products ?? [] : undefined,
      };
    }),
    blockers: topBlockers(report, locale),
    gaps: mergedGaps(report).map((gap) => ({ ...gap, questions: gap.questions.length })),
    advisory: advisoryItems(report, locale),
    stamp: report.stamp,
  };
}

export function modelFromSnapshot(snapshot: ScanSnapshot, locale: Locale, allLabel: string): ReportModel {
  const names = new Map(snapshot.categories.map((row) => [row.setId, row.category]));
  const questions = snapshot.questions?.map((row): ModelQuestion => {
    const split = row.unusable !== undefined && row.incomplete !== undefined;
    return {
      ...row,
      unusable: split ? row.unusable : undefined,
      incomplete: split ? row.incomplete : undefined,
      weak: split ? undefined : row.weak,
    };
  });

  // Dezelfde samenvoeging als `topBlockers`: op vraagtekst, over alle sets heen.
  const blockers = new Map<string, Blocker>();
  for (const row of snapshot.questions ?? []) {
    const label = row.label[locale];
    const entry = blockers.get(label) ?? { label, open: 0, empty: 0, ids: [] };
    entry.open += row.applicable - row.answered;
    entry.empty += row.empty;
    if (!entry.ids.includes(row.questionId)) entry.ids.push(row.questionId);
    blockers.set(label, entry);
  }

  return {
    funnel: {
      total: snapshot.productCount,
      qualified: snapshot.qualified,
      findable: snapshot.findable,
      avgAnswered: snapshot.avgAnswered,
      avgApplicable: snapshot.avgApplicable,
      avgEarned: snapshot.avgEarned,
      avgWeight: snapshot.avgWeight,
    },
    unmatchedCount: snapshot.unmatchedCount,
    hasCritical: snapshot.categories.some((row) => (row.critical?.total ?? 0) > 0),
    categories: snapshot.categories,
    scoreRows: snapshotScoreRows(snapshot, allLabel),
    hasSubcategories: snapshot.hasSubcategories,
    questions,
    blockers: {
      top: [...blockers.values()].sort((a, b) => b.open - a.open).slice(0, 2),
      wouldBecome: snapshot.wouldBecome?.[locale],
      nearest: snapshot.distance.find((bucket) => bucket.open > 0),
    },
    // Oudere snapshots bewaarden de gaten nog niet samengevoegd.
    gaps: [...snapshot.gaps.reduce((merged, gap) => {
      const id = `${gap.field}|${gap.cause}`;
      const existing = merged.get(id);
      if (!existing || gap.affected > existing.affected) merged.set(id, gap);
      return merged;
    }, new Map<string, ScanSnapshot['gaps'][number]>()).values()]
      .sort((a, b) => b.affected - a.affected)
      .slice(0, 25),
    advisory: (snapshot.advisory ?? []).map((row) => ({
      id: row.questionId,
      label: row.label[locale],
      importance: row.importance,
      categories: [...new Set(row.setIds.map((id) => names.get(id) ?? id))],
    })),
    stamp: {
      scanVersion: snapshot.scanVersion,
      fieldRegister: snapshot.fieldRegister,
      questionSetVersion: snapshot.questionSetVersion,
      banks: snapshot.banks,
      blindAttributes: snapshot.blindAttributes ?? [],
      scannedAt: snapshot.scannedAt,
    },
  };
}

/** Zoals `scoreRows`, maar een gemiddelde dat een oudere snapshot niet had blijft leeg. */
function snapshotScoreRows(snapshot: ScanSnapshot, allLabel: string): ModelScoreRow[] {
  const mains = snapshot.categories.filter((row) => row.subcategory === undefined);
  const total = mains.reduce((sum, row) => sum + row.total, 0);
  const mix = (pick: (row: typeof mains[number]) => Average | undefined): Average | undefined => {
    if (mains.length === 0 || mains.some((row) => pick(row) === undefined)) return undefined;
    return {
      answered: total === 0 ? 0 : mains.reduce((sum, row) => sum + pick(row)!.answered * row.total, 0) / total,
      total: total === 0 ? 0 : mains.reduce((sum, row) => sum + pick(row)!.total * row.total, 0) / total,
    };
  };
  const allOf = (row: ScanSnapshot['categories'][number]): Average =>
    row.all ?? { answered: row.avgAnswered, total: row.avgApplicable };

  return [
    { key: 'all', label: allLabel, total, critical: mix((row) => row.critical), general: mix((row) => row.general), all: mix(allOf) },
    ...snapshot.categories.map((row) => ({
      key: `${row.setId}|${row.subcategory ?? ''}`,
      label: row.subcategory ? `${row.category} › ${row.subcategory}` : row.category,
      total: row.total,
      critical: row.critical,
      general: row.general,
      all: allOf(row),
    })),
  ];
}
