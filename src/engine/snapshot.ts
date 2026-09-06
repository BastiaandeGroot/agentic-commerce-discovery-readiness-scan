// Een rapport in een vorm die je kunt bewaren en vergelijken.
//
// Een volledig ScanReport draagt elk product en de hele bron mee; bij een
// catalogus van een paar duizend producten is dat tientallen megabytes en niets
// daarvan heb je nodig om te zien wat er sinds vorige keer veranderde. Een
// snapshot houdt de uitkomst en gooit de invoer weg.
//
// Dat is ook een privacybeslissing. Wat hier overblijft zijn tellingen,
// categorienamen en veldnamen; de productdata zelf blijft waar hij was. Wordt dit
// later serverzijdig bewaard, dan gaat er dus geen catalogus mee de deur uit.

import type { Bilingual, GapCause, ScanReport } from '../domain/types';

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
  qualified: number;
  findable: number;
  avgAnswered: number;
  avgApplicable: number;
  avgEarned: number;
  avgWeight: number;
}

export interface ScanSnapshot {
  id: string;
  /** Elke rij met merchantdata draagt een account, ook nu er nog geen login is. */
  accountId: string;
  savedAt: string;
  label: string;
  scanVersion: string;
  fieldRegister: string;
  questionSetVersion: number;
  /**
   * De banken waarlangs gemeten is, met hun versie. Klein genoeg om te bewaren
   * en onmisbaar om te vergelijken: een bank die vernieuwde verschuift de
   * meetlat net zo hard als een wijziging in de scanregels.
   */
  banks: { id: string; version: string; status: string }[];
  catalogName: string;
  productCount: number;
  unmatchedCount: number;
  qualified: number;
  findable: number;
  avgAnswered: number;
  avgApplicable: number;
  avgEarned: number;
  avgWeight: number;
  /** Hoeveel producten hebben er nog n vragen open. */
  distance: { open: number; products: number }[];
  categories: SnapshotCategory[];
  gaps: SnapshotGap[];
}

/** Hoeveel gaten we bewaren. Genoeg om te vergelijken, niet de hele staart. */
const MAX_GAPS = 30;

export function toSnapshot(
  report: ScanReport,
  options: { id: string; accountId: string; savedAt: string; label: string },
): ScanSnapshot {
  return {
    id: options.id,
    accountId: options.accountId,
    savedAt: options.savedAt,
    label: options.label,
    scanVersion: report.stamp.scanVersion,
    fieldRegister: report.stamp.fieldRegister,
    questionSetVersion: report.stamp.questionSetVersion,
    banks: report.stamp.banks.map((bank) => ({
      id: bank.id, version: bank.version, status: bank.status,
    })),
    catalogName: report.sources.catalog.filename,
    productCount: report.productCount,
    unmatchedCount: report.unmatchedCount,
    qualified: report.funnel.qualified,
    findable: report.funnel.findable,
    avgAnswered: report.funnel.avgAnswered,
    avgApplicable: report.funnel.avgApplicable,
    avgEarned: report.funnel.avgEarned,
    avgWeight: report.funnel.avgWeight,
    distance: report.distance.map((bucket) => ({ ...bucket })),
    categories: report.categories.map((category) => ({
      setId: category.setId,
      category: category.category,
      total: category.total,
      qualified: category.qualified,
      findable: category.findable,
      avgAnswered: category.avgAnswered,
      avgApplicable: category.avgApplicable,
      avgEarned: category.avgEarned,
      avgWeight: category.avgWeight,
    })),
    gaps: report.gaps.slice(0, MAX_GAPS).map((gap) => ({
      field: gap.field,
      label: gap.label,
      cause: gap.cause,
      affected: gap.affected,
    })),
  };
}
