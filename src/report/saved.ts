// Een bewaarde analyse zoals hij er nu voor staat.
//
// De scan legde de samenstelling vast zonder het werk van de merchant erover, en
// per product de toestand van elke vraag. Het werk van nu — uitgezette,
// aangepaste en eigen vragen — komt daar opnieuw overheen, en het rapport wordt
// opnieuw opgeteld. Dezelfde weg als de scan zelf (`applyWork`, `rescoreOutcomes`),
// zodat het vragensetscherm, het rapport en een volgende scan hetzelfde zeggen.
//
// Puur: geen klok, geen opslag.

import type { ChangeLogEntry, ScanReport, QuestionSetState } from '../domain/types';
import type { ScanSnapshot, SnapshotDetail } from '../engine/snapshot';
import { rescoreOutcomes } from '../engine/rescore';
import { applyWork, type QuestionWork } from '../questions/work';

export interface SavedAnalysis {
  /** De vragensets met het werk van nu erover. */
  state: QuestionSetState;
  /** Het rapport opnieuw opgeteld op die sets. */
  report: ScanReport;
  /** Vragen die aanstaan maar bij deze scan niet gemeten zijn. */
  unmeasured: { setId: string; questionId: string }[];
  /** Wat de merchant na de scan aan zijn vragen veranderde. */
  changedSince: ChangeLogEntry[];
}

/** De markt waar het werk onder bewaard wordt. */
export function verticalOf(detail: SnapshotDetail): { vertical: string; version: string } | undefined {
  const bank = detail.pristine.banks[0];
  return bank ? { vertical: bank.id, version: bank.version } : undefined;
}

export function savedAnalysis(
  snapshot: ScanSnapshot,
  detail: SnapshotDetail,
  work: QuestionWork | undefined,
): SavedAnalysis {
  const { state } = applyWork(detail.pristine, work);
  const scannedAt = snapshot.scannedAt ?? snapshot.savedAt;
  const { report, unmeasured } = rescoreOutcomes(detail.outcomes, state, {
    filename: snapshot.catalogName,
    scannedAt,
  });
  // De meting is van toen, dus ook de scanregels: het stempel noemt die versie.
  report.stamp = { ...report.stamp, scanVersion: snapshot.scanVersion };
  return {
    state,
    report,
    unmeasured,
    changedSince: (work?.changeLog ?? []).filter((entry) => entry.at > scannedAt),
  };
}
