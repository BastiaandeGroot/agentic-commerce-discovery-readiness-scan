'use client';

// Een bewaarde analyse terugzien, in hetzelfde rapport als na een scan.
//
// Het scherm is hetzelfde (`ReportBody`), zodat een merchant niet twee manieren
// hoeft te leren om dezelfde uitkomst te lezen. Wat de producten zelf vraagt —
// per product kijken, de pdf — staat er niet, en op de plek van de verkenner zegt
// het scherm waarom.
//
// Bewaarde de scan ook zijn vragensets en metingen (`SnapshotDetail`), dan telt
// het rapport opnieuw op met het werk van nu: een vraag die de merchant daarna
// uitzette, is hier al weg. Dat staat er dan bij, want een cijfer dat verschuift
// zonder nieuwe scan hoort niemand zelf te moeten verklaren. Een oudere analyse
// toont wat er bewaard is.

import { useMemo } from 'react';
import type { Locale, Strings } from '../src/i18n/strings';
import type { ScanSnapshot, SnapshotDetail } from '../src/engine/snapshot';
import type { QuestionWork } from '../src/questions/work';
import { modelFromReport, modelFromSnapshot } from '../src/report/model';
import { savedAnalysis } from '../src/report/saved';
import { ReportBody } from './ReportView';
import { RemoveSnapshotButton } from './ScanList';
import { Button, Card, CardTitle } from './ui';

function datum(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SnapshotReport({ s, locale, snapshot, detail, work, onRescan, onReviewQuestion, onEditQuestions, onRemove }: {
  s: Strings;
  locale: Locale;
  snapshot: ScanSnapshot;
  /** De vragensets en metingen van de scan, als die bewaard zijn. */
  detail?: SnapshotDetail;
  /** Het werk van nu op de vragensets van deze markt. */
  work?: QuestionWork;
  onRescan: () => void;
  onReviewQuestion?: (question: { setId: string; questionId: string; base: boolean }) => void;
  /** Naar de vragensets van deze analyse; alleen als die bewaard zijn. */
  onEditQuestions?: () => void;
  /** Deze analyse verwijderen, na bevestiging; gooit bij een fout. */
  onRemove?: () => Promise<void>;
}) {
  const saved = useMemo(() => (detail ? savedAnalysis(snapshot, detail, work) : undefined), [snapshot, detail, work]);
  const model = useMemo(
    () => (saved
      ? modelFromReport(saved.report, locale, s.report.scoreAllCategories)
      : modelFromSnapshot(snapshot, locale, s.report.scoreAllCategories)),
    [saved, snapshot, locale, s.report.scoreAllCategories],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={`${datum(snapshot.savedAt, locale)} · ${snapshot.catalogName}`}>{snapshot.label}</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          {onEditQuestions ? (
            <>
              <Button variant="secondary" onClick={onEditQuestions}>{s.pages.dashboard.editQuestions}</Button>
              <span className="text-xs leading-relaxed text-muted">{s.pages.dashboard.editQuestionsNote}</span>
            </>
          ) : null}
          {onRemove ? (
            <span className="ml-auto">
              <RemoveSnapshotButton s={s} locale={locale} snapshot={snapshot} onRemove={onRemove} />
            </span>
          ) : null}
        </div>
      </Card>

      {/* Bovenaan: wie een cijfer leest dat anders is dan bij de scan, hoort
          meteen te weten waarom. */}
      {saved && (saved.changedSince.length > 0 || saved.unmeasured.length > 0) ? (
        <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
          <p className="font-medium">{s.pages.dashboard.adjustedHeading}</p>
          {saved.changedSince.length > 0 ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {s.pages.dashboard.adjustedBody.replace('{aantal}', String(saved.changedSince.length))}
            </p>
          ) : null}
          {saved.unmeasured.length > 0 ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {s.pages.dashboard.unmeasuredBody.replace('{aantal}', String(new Set(saved.unmeasured.map((entry) => entry.questionId)).size))}
            </p>
          ) : null}
        </div>
      ) : null}

      <ReportBody
        s={s}
        locale={locale}
        model={model}
        onReviewQuestion={onReviewQuestion}
        explorer={
          <Card>
            <p className="text-sm leading-relaxed text-muted">{s.pages.dashboard.snapshotNoProducts}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={onRescan}>{s.pages.dashboard.rescan}</Button>
              <span className="text-xs leading-relaxed text-muted">{s.pages.dashboard.rescanNote}</span>
            </div>
          </Card>
        }
      />
    </div>
  );
}
