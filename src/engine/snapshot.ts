// Een rapport in een vorm die je kunt bewaren en vergelijken.
//
// Een volledig ScanReport draagt elk product en elke bron mee; bij een catalogus
// van een paar duizend producten is dat tientallen megabytes en niets daarvan
// heb je nodig om te zien wat er sinds vorige keer veranderde. Een snapshot
// houdt de uitkomst en gooit de invoer weg.
//
// Dat is ook een privacybeslissing. Wat hier overblijft zijn tellingen en
// categorienamen; de productdata zelf blijft waar hij was. Wordt dit later
// serverzijdig bewaard, dan gaat er dus geen catalogus mee de deur uit.

import type { Bilingual, GapCause, Protocol, ScanReport } from '../domain/types';

export interface SnapshotGap {
  field: string;
  label: Bilingual;
  cause: GapCause;
  affected: number;
}

export interface SnapshotCategory {
  setId: string;
  category: string;
  total: number;
  findable: number;
  competitive: number;
  avgAnswered: number;
  avgApplicable: number;
}

export interface SnapshotProtocol {
  total: number;
  findable: number;
  competitive: number;
  avgAnswered: number;
  avgApplicable: number;
  /** Hoeveel producten hebben er nog n vragen open. */
  distance: { open: number; products: number }[];
  categories: SnapshotCategory[];
  gaps: SnapshotGap[];
}

export interface ScanSnapshot {
  id: string;
  /** Elke rij met merchantdata draagt een account, ook nu er nog geen login is. */
  accountId: string;
  savedAt: string;
  label: string;
  scanVersion: string;
  specSnapshot: string;
  questionSetVersion: number;
  feedName: string;
  catalogName?: string;
  productCount: number;
  unmatchedCount: number;
  protocols: Record<Protocol, SnapshotProtocol>;
}

/** Hoeveel gaten we bewaren. Genoeg om te vergelijken, niet de hele staart. */
const MAX_GAPS = 30;

export function toSnapshot(
  report: ScanReport,
  options: { id: string; accountId: string; savedAt: string; label: string },
): ScanSnapshot {
  const protocols = {} as Record<Protocol, SnapshotProtocol>;
  for (const protocol of ['acp', 'ucp'] as Protocol[]) {
    const source = report.protocols[protocol];
    protocols[protocol] = {
      total: source.funnel.total,
      findable: source.funnel.findable,
      competitive: source.funnel.competitive,
      avgAnswered: source.funnel.avgAnswered,
      avgApplicable: source.funnel.avgApplicable,
      distance: source.distance.map((bucket) => ({ ...bucket })),
      categories: source.categories.map((category) => ({
        setId: category.setId,
        category: category.category,
        total: category.total,
        findable: category.findable,
        competitive: category.competitive,
        avgAnswered: category.avgAnswered,
        avgApplicable: category.avgApplicable,
      })),
      gaps: source.gaps.slice(0, MAX_GAPS).map((gap) => ({
        field: gap.field,
        label: gap.label,
        cause: gap.cause,
        affected: gap.affected,
      })),
    };
  }

  return {
    id: options.id,
    accountId: options.accountId,
    savedAt: options.savedAt,
    label: options.label,
    scanVersion: report.stamp.scanVersion,
    specSnapshot: report.stamp.specSnapshot,
    questionSetVersion: report.stamp.questionSetVersion,
    feedName: report.sources.feed.filename,
    catalogName: report.sources.catalog?.filename,
    productCount: report.productCount,
    unmatchedCount: report.unmatchedCount,
    protocols,
  };
}
