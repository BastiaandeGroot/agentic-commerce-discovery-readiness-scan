// Aggregatie tot het scanrapport.
//
// De kop is een trechter, geen cijfer (§5): totaal -> vindbaar -> concurrerend,
// per protocol apart uitgerekend omdat de beschikbare velden verschillen.
// Er bestaat met opzet geen gecombineerd Core/Selection-getal: dat middelt
// ongelijke dingen en vernietigt precies de routering waar het product om draait.
//
// Naast de feed-brede cijfers levert dit bestand twee fijnere niveaus: per
// categorie en per product. Een feed-breed getal vertelt een merchant dat er werk
// is; pas de categorie zegt wáár, en pas het product zegt wat.

import type {
  CategoryReport, Dataset, Gap, ProductRecord, ProductResult, Protocol,
  ProtocolReport, QuestionSetState, ScanReport,
} from '../domain/types';
import { OUT_CHECKS, SELECTION_CHECKLIST } from './checklists';
import { evaluateProduct } from './evaluate';
import { indexCatalog, lookupCatalog } from './join';
import { SPEC_SNAPSHOT_ID } from '../spec/snapshot';
import { SCAN_VERSION } from './version';

const PROTOCOLS: Protocol[] = ['acp', 'ucp'];

/** Tel gaps samen over een verzameling producten, op veld en oorzaak. */
function aggregateGaps(results: ProductResult[]): Gap[] {
  const totals = new Map<string, Gap>();
  for (const result of results) {
    for (const gap of result.gaps) {
      const id = `${gap.field}|${gap.cause}`;
      const existing = totals.get(id);
      if (existing) existing.affected += 1;
      else totals.set(id, { ...gap });
    }
  }
  return [...totals.values()].sort((a, b) => b.affected - a.affected);
}

function answeredStats(results: ProductResult[], protocol: Protocol) {
  if (results.length === 0) return { avgAnswered: 0, avgApplicable: 0 };
  let answered = 0;
  let applicable = 0;
  for (const result of results) {
    const questions = result.perProtocol[protocol].questions;
    answered += questions.filter((q) => q.answered).length;
    applicable += questions.length;
  }
  return {
    avgAnswered: answered / results.length,
    avgApplicable: applicable / results.length,
  };
}

function buildCategoryReports(
  results: ProductResult[],
  protocol: Protocol,
  questionState: QuestionSetState,
): CategoryReport[] {
  const grouped = new Map<string, ProductResult[]>();
  for (const result of results) {
    if (result.unmatched || !result.setId) continue;
    const list = grouped.get(result.setId) ?? [];
    list.push(result);
    grouped.set(result.setId, list);
  }

  return [...grouped.entries()]
    .map(([setId, members]) => {
      const set = questionState.sets.find((s) => s.id === setId);
      const stats = answeredStats(members, protocol);
      return {
        setId,
        category: set?.category ?? set?.label.nl ?? setId,
        total: members.length,
        findable: members.filter((m) => m.perProtocol[protocol].findable).length,
        competitive: members.filter((m) => m.perProtocol[protocol].competitive).length,
        ...stats,
        topGaps: aggregateGaps(members)
          .slice(0, 4)
          .map((g) => ({ field: g.field, label: g.label, cause: g.cause, affected: g.affected })),
      };
    })
    .sort((a, b) => b.total - a.total);
}

function buildProtocolReport(
  protocol: Protocol,
  results: ProductResult[],
  questionState: QuestionSetState,
): ProtocolReport {
  const scored = results.filter((r) => !r.unmatched);

  // Per vraag: hoeveel producten die de set gebruiken, beantwoorden hem?
  const coverage = new Map<string, {
    setId: string; questionId: string; label: { nl: string; en: string };
    answered: number; enrichable: number; applicable: number;
  }>();
  for (const result of scored) {
    for (const question of result.perProtocol[protocol].questions) {
      const id = `${result.setId}|${question.questionId}`;
      const entry = coverage.get(id) ?? {
        setId: result.setId ?? '',
        questionId: question.questionId,
        label: question.label,
        answered: 0,
        enrichable: 0,
        applicable: 0,
      };
      entry.applicable += 1;
      if (question.answered) entry.answered += 1;
      else if (question.enrichable) entry.enrichable += 1;
      coverage.set(id, entry);
    }
  }

  const selectionCoverage = SELECTION_CHECKLIST[protocol].map((item) => ({
    id: item.id,
    label: item.label,
    present: scored.filter(
      (r) => r.perProtocol[protocol].selection.find((s) => s.id === item.id)?.present,
    ).length,
    total: scored.length,
  }));

  // Out-tier telt over ALLE producten, ook de niet-gescoorde: een product zonder
  // categorie kan nog steeds stilzwijgend uit de checkout vallen.
  const outWarnings = OUT_CHECKS[protocol].map((check) => ({
    id: check.id,
    label: check.label,
    affected: results.filter(
      (r) => !r.perProtocol[protocol].outWarnings.find((w) => w.id === check.id)?.present,
    ).length,
    note: check.note,
  }));

  return {
    protocol,
    funnel: {
      total: results.length,
      findable: scored.filter((r) => r.perProtocol[protocol].findable).length,
      competitive: scored.filter((r) => r.perProtocol[protocol].competitive).length,
      ...answeredStats(scored, protocol),
    },
    questionCoverage: [...coverage.values()].sort(
      (a, b) => a.answered / Math.max(a.applicable, 1) - b.answered / Math.max(b.applicable, 1),
    ),
    selectionCoverage,
    outWarnings,
    gaps: aggregateGaps(scored),
    categories: buildCategoryReports(results, protocol, questionState),
  };
}

export function runScan(
  feed: Dataset,
  catalog: Dataset | undefined,
  questionState: QuestionSetState,
  /** Het tijdstip komt van de aanroeper: een motor met een eigen klok geeft op
   *  dezelfde invoer twee keer een ander rapport. */
  options: { scannedAt: string },
): ScanReport {
  const catalogIndex = indexCatalog(catalog);
  const products = feed.products.map((product) =>
    evaluateProduct(product, questionState.sets, catalog, lookupCatalog(catalogIndex, product)),
  );

  return {
    stamp: {
      scanVersion: SCAN_VERSION,
      specSnapshot: SPEC_SNAPSHOT_ID,
      questionSetVersion: questionState.version,
      scannedAt: options.scannedAt,
    },
    sources: { feed, catalog },
    productCount: products.length,
    unmatchedCount: products.filter((p) => p.unmatched).length,
    protocols: {
      acp: buildProtocolReport('acp', products, questionState),
      ucp: buildProtocolReport('ucp', products, questionState),
    },
    products,
  };
}
