'use client';

// Een bewaarde analyse terugzien.
//
// Uit de snapshot en niet uit een volledig rapport: er gaan geen producten mee
// de opslag in. Wat hier staat zijn de tellingen, de gemiddelden per categorie,
// de werklijst met onbeantwoorde vragen en de gaten — genoeg om te zien waar je
// stond en wat er te doen was, zonder de catalogus opnieuw in te lezen. Per
// product kijken kan alleen met een nieuwe scan; dat zegt het scherm erbij.
//
// Dicht, zoals het rapport: dit is een verslag om te lezen en te vergelijken.

import type { Locale, Strings } from '../src/i18n/strings';
import type { ScanSnapshot, SnapshotAverage } from '../src/engine/snapshot';
import { Badge, Bar, Button, Card, CardTitle, TableWrap, Td, Th } from './ui';

function datum(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SnapshotReport({ s, locale, snapshot, onRescan }: {
  s: Strings;
  locale: Locale;
  snapshot: ScanSnapshot;
  onRescan: () => void;
}) {
  const tag = locale === 'nl' ? 'nl-NL' : 'en-GB';
  const n = (value: number) => value.toLocaleString(tag);
  const one = (value: number) => value.toLocaleString(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const average = (value: SnapshotAverage | undefined) =>
    value ? `${one(value.answered)} ${s.report.scoreOf} ${one(value.total)}` : '—';
  const scored = snapshot.productCount - snapshot.unmatchedCount;
  const categoryName = new Map(snapshot.categories.map((row) => [row.setId, row.category]));
  const causeTone = { unfilled: 'ok', unmodelled: 'warn', 'no-source': 'danger' } as const;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={`${datum(snapshot.savedAt, locale)} · ${snapshot.catalogName}`}>{snapshot.label}</CardTitle>
        <p className="text-sm leading-relaxed text-muted">{s.pages.dashboard.snapshotNoProducts}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onRescan}>{s.pages.dashboard.rescan}</Button>
          <span className="text-xs leading-relaxed text-muted">{s.pages.dashboard.rescanNote}</span>
        </div>
      </Card>

      {/* De trechter, zoals in het rapport. */}
      <Card>
        <CardTitle>{s.report.funnelHeading}</CardTitle>
        <div className="space-y-3">
          {[
            { label: s.report.total, value: snapshot.productCount },
            { label: s.report.qualified, value: snapshot.qualified },
            { label: s.report.findable, value: snapshot.findable },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="tnum text-2xl font-semibold">{n(row.value)}</span>
                <span className="text-sm text-muted">{row.label}</span>
              </div>
              <div className="mt-1.5">
                <Bar value={row.value} total={snapshot.productCount} tone={row.label === s.report.total ? 'neutral' : 'ok'} />
              </div>
            </div>
          ))}
        </div>
        <p className="tnum mt-3 text-sm text-muted">
          {one(snapshot.avgAnswered)} {s.report.statusScale} {n(Math.round(snapshot.avgApplicable))} {s.report.statusAnswered}
          {' · '}{s.report.avgPointsLine} {one(snapshot.avgEarned)} {s.report.statusScale} {n(Math.round(snapshot.avgWeight))} {s.report.points}
        </p>
        {snapshot.unmatchedCount > 0 ? (
          <p className="tnum mt-1 text-xs text-muted">{n(snapshot.unmatchedCount)} {s.report.unmatched}</p>
        ) : null}
      </Card>

      {snapshot.categories.length > 0 ? (
        <Card>
          <CardTitle sub={s.report.scoreIntro}>{s.pages.dashboard.snapshotCategories}</CardTitle>
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{s.report.filterCategory}</Th>
                <Th align="right">{s.report.gapAffected}</Th>
                <Th align="right">{s.report.scoreCritical}</Th>
                <Th align="right">{s.report.scoreAll}</Th>
                <Th align="right">{s.report.findable}</Th>
              </tr>
            </thead>
            <tbody>
              {snapshot.categories.map((row) => (
                <tr key={`${row.setId}-${row.subcategory ?? ''}`} className="border-b border-line last:border-b-0">
                  <Td>
                    <span className={row.subcategory ? 'pl-4' : ''}>
                      {row.subcategory ? `${row.category} › ${row.subcategory}` : row.category}
                    </span>
                  </Td>
                  <Td align="right" numeric>{n(row.total)}</Td>
                  <Td align="right" numeric>{average(row.critical)}</Td>
                  <Td align="right" numeric>
                    {row.all ? average(row.all) : `${one(row.avgAnswered)} ${s.report.scoreOf} ${one(row.avgApplicable)}`}
                  </Td>
                  <Td align="right" numeric>{n(row.findable)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="tnum mt-2 text-xs text-muted">{n(scored)} {s.report.scoreProducts} {s.report.scoreAllCategories.toLowerCase()}</p>
        </Card>
      ) : null}

      {/* De werklijst. Oudere snapshots hebben hem niet, en dat staat erbij. */}
      <Card>
        <CardTitle sub={s.report.questionsIntro}>{s.pages.dashboard.snapshotQuestions}</CardTitle>
        {snapshot.questions === undefined ? (
          <p className="text-sm text-muted">{s.pages.dashboard.snapshotOld}</p>
        ) : snapshot.questions.length === 0 ? (
          <p className="text-sm text-muted">{s.report.allAnswered}</p>
        ) : (
          <TableWrap minWidth="40rem">
            <thead>
              <tr className="border-b border-line">
                <Th>{s.report.pdfQuestion}</Th>
                <Th>{s.report.filterCategory}</Th>
                <Th align="right">{s.report.pdfAnswered}</Th>
                <Th>{s.report.pdfStuck}</Th>
              </tr>
            </thead>
            <tbody>
              {snapshot.questions.map((row) => (
                <tr key={`${row.setId}-${row.questionId}`} className="border-b border-line last:border-b-0">
                  <Td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {row.importance === 'critical' ? <Badge tone="danger">{s.questions.importance.critical}</Badge> : null}
                      <span>{row.label[locale]}</span>
                    </span>
                  </Td>
                  <Td><span className="text-xs text-muted">{categoryName.get(row.setId) ?? row.setId}</span></Td>
                  <Td align="right" numeric>{n(row.answered)}/{n(row.applicable)}</Td>
                  <Td>
                    <span className="text-xs text-muted">
                      {[
                        row.empty > 0 ? `${n(row.empty)} ${s.report.enrichable}` : '',
                        row.weak > 0 ? `${n(row.weak)} ${s.pages.dashboard.snapshotWeak}` : '',
                        row.absent > 0 ? `${n(row.absent)} ${s.report.neither}` : '',
                      ].filter(Boolean).join(', ')}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {snapshot.gaps.length > 0 ? (
        <Card>
          <CardTitle sub={s.report.gapsIntro}>{s.report.gapsHeading}</CardTitle>
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{s.report.gapField}</Th>
                <Th>{s.report.gapCause}</Th>
                <Th align="right">{s.report.gapAffected}</Th>
              </tr>
            </thead>
            <tbody>
              {snapshot.gaps.map((gap) => (
                <tr key={`${gap.field}-${gap.cause}`} className="border-b border-line last:border-b-0">
                  <Td>{gap.label[locale]}</Td>
                  <Td>
                    <Badge tone={causeTone[gap.cause]}>{s.report.causes[gap.cause]}</Badge>
                    <span className="mt-0.5 block text-xs text-muted">{s.report.causeMeaning[gap.cause]}</span>
                  </Td>
                  <Td align="right" numeric>{n(gap.affected)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      ) : null}

      {snapshot.advisory && snapshot.advisory.length > 0 ? (
        <Card>
          <CardTitle sub={s.report.advisoryIntro}>{s.report.advisoryHeading}</CardTitle>
          <ul className="space-y-2">
            {snapshot.advisory.map((row) => (
              <li key={row.questionId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-2 first:border-t-0 first:pt-0">
                <Badge tone="neutral">{s.questions.importance[row.importance] ?? row.importance}</Badge>
                <span className="min-w-0 flex-1 text-sm">{row.label[locale]}</span>
                <span className="text-xs text-muted">{row.setIds.map((id) => categoryName.get(id) ?? id).join(', ')}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle sub={s.report.stampExplain}>{s.report.stampHeading}</CardTitle>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{s.report.scanVersion}</dt>
            <dd className="tnum font-medium">v{snapshot.scanVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.specSnapshot}</dt>
            <dd className="tnum font-medium">{snapshot.fieldRegister}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.bankVersion}</dt>
            <dd className="tnum font-medium">
              {snapshot.banks.length === 0 ? '—' : snapshot.banks.map((bank) => `${bank.id} ${bank.version}`).join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.questionVersion}</dt>
            <dd className="tnum font-medium">v{snapshot.questionSetVersion}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
