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

import type { Bilingual, GapCause, QuestionSetState, ScanReport } from '../domain/types';
import { topBlockers } from '../report/derive';
import { captureOutcomes, type ScanOutcomes } from './rescore';

export interface SnapshotGap {
  field: string;
  label: Bilingual;
  cause: GapCause;
  affected: number;
  /** Hoeveel vragen dit gat blokkeert. Ontbreekt bij oudere snapshots. */
  questions?: number;
}

export interface SnapshotAverage { answered: number; total: number }

export interface SnapshotCategory {
  setId: string;
  category: string;
  subcategory?: string;
  total: number;
  qualified: number;
  findable: number;
  avgAnswered: number;
  avgApplicable: number;
  avgEarned: number;
  avgWeight: number;
  /** De drie gemiddelden waar een merchant op stuurt. Ontbreekt bij oudere snapshots. */
  critical?: SnapshotAverage;
  general?: SnapshotAverage;
  all?: SnapshotAverage;
}

/**
 * Een onbeantwoorde vraag, met waar hij strandt.
 *
 * De tekst van de vraag komt uit de vragenbank en de getallen zijn tellingen:
 * dit is de werklijst van de merchant zonder één product erin.
 */
export interface SnapshotQuestion {
  setId: string;
  questionId: string;
  label: Bilingual;
  importance: string;
  layer?: 'base' | 'category';
  answered: number;
  applicable: number;
  /** Het veld bestaat maar staat leeg. */
  empty: number;
  /** Gevuld maar te mager, of deels beantwoord. */
  weak: number;
  /** De twee helften van `weak` los. Ontbreken bij oudere snapshots. */
  unusable?: number;
  incomplete?: number;
  /** Geen veld voor. */
  absent: number;
  /** Per kenmerk de kolommen waar het antwoord vandaan zou komen: veldnamen, geen waarden. */
  evidence?: { attributeKey: string; label: Bilingual; fields: string[] }[];
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
  banks: { id: string; version: string; status: string; label?: Bilingual }[];
  /** Kenmerken uit de bank die op geen kolom slaan. Ontbreekt bij oudere snapshots. */
  blindAttributes?: { key: string; label: Bilingual }[];
  /** Wanneer de scan liep; `savedAt` is wanneer hij bewaard werd. */
  scannedAt?: string;
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
  /**
   * Hoeveel producten volledig worden als de grootste twee blokkades weg zijn.
   * Dat vraagt de producten, dus het wordt bij het bewaren uitgerekend. Per taal,
   * omdat de blokkades op vraagtekst worden samengenomen.
   */
  wouldBecome?: Record<'nl' | 'en', number>;
  /** Heeft de catalogus subcategorieën, los van of de vragenlijst ze onderscheidt. */
  hasSubcategories?: boolean;
  categories: SnapshotCategory[];
  gaps: SnapshotGap[];
  /** Onbeantwoorde gescoorde vragen, beste eerst. Ontbreekt bij oudere snapshots. */
  questions?: SnapshotQuestion[];
  /** Vragen buiten de score, één keer per vraag met de sets waar ze spelen. */
  advisory?: { questionId: string; label: Bilingual; importance: string; setIds: string[] }[];
}

/**
 * Wat een bewaarde analyse nodig heeft om zonder catalogus bij te werken.
 *
 * Los van de snapshot bewaard en pas opgehaald als de analyse open gaat: het is
 * een paar honderd kilobyte, en een lijst van alle analyses heeft het niet nodig.
 */
export interface SnapshotDetail {
  /** De vragensets zoals ze voor deze scan zijn samengesteld, zonder het werk van de merchant. */
  pristine: QuestionSetState;
  /** Per product de toestand van elke vraag; zie `src/engine/rescore.ts`. */
  outcomes: ScanOutcomes;
}

export function toSnapshotDetail(report: ScanReport, pristine: QuestionSetState): SnapshotDetail {
  return { pristine, outcomes: captureOutcomes(report) };
}

/** Hoeveel gaten we bewaren. Genoeg om te vergelijken, niet de hele staart. */
const MAX_GAPS = 30;
/** Hoeveel onbeantwoorde vragen we bewaren. Ruim genoeg voor de werklijst van een grote bank. */
const MAX_QUESTIONS = 300;

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
      id: bank.id, version: bank.version, status: bank.status, label: bank.label,
    })),
    blindAttributes: report.stamp.blindAttributes.map((attribute) => ({ key: attribute.key, label: attribute.label })),
    scannedAt: report.stamp.scannedAt,
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
    wouldBecome: { nl: topBlockers(report, 'nl').wouldBecome, en: topBlockers(report, 'en').wouldBecome },
    hasSubcategories: report.products.some((product) => product.subcategory !== undefined),
    categories: report.categories.map((category) => ({
      setId: category.setId,
      category: category.category,
      subcategory: category.subcategory,
      critical: { ...category.critical },
      general: { ...category.general },
      all: { ...category.all },
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
      questions: gap.questions.length,
    })),
    questions: report.questionCoverage
      .filter((row) => row.scored && row.answered < row.applicable)
      .sort((a, b) => b.answered / Math.max(b.applicable, 1) - a.answered / Math.max(a.applicable, 1))
      .slice(0, MAX_QUESTIONS)
      .map((row) => ({
        setId: row.setId,
        questionId: row.questionId,
        label: row.label,
        importance: row.importance,
        layer: row.layer,
        answered: row.answered,
        applicable: row.applicable,
        empty: row.empty,
        weak: row.unusable + row.incomplete,
        unusable: row.unusable,
        incomplete: row.incomplete,
        absent: row.absent,
        evidence: row.evidence?.map((group) => ({ attributeKey: group.attributeKey, label: group.label, fields: [...group.fields] })),
      })),
    advisory: [...report.advisory.reduce((byId, row) => {
      const entry = byId.get(row.questionId) ?? { questionId: row.questionId, label: row.label, importance: row.importance, setIds: [] as string[] };
      if (!entry.setIds.includes(row.setId)) entry.setIds.push(row.setId);
      byId.set(row.questionId, entry);
      return byId;
    }, new Map<string, { questionId: string; label: Bilingual; importance: string; setIds: string[] }>()).values()],
  };
}
