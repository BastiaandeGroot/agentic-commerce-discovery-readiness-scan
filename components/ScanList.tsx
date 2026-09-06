'use client';

// Gedeelde onderdelen voor het dashboard: de lijst met bewaarde scans en het
// verschil tussen twee ervan.

import type { Locale, Strings } from '../src/i18n/strings';
import type { ScanSnapshot } from '../src/engine/snapshot';
import type { Comparison, Delta } from '../src/engine/compare';
import { Badge, Bar, Button, Card, CardTitle } from './ui';

export function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

function datum(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Een verschil met richting. Meer is niet vanzelf beter, dus geen groen pijltje
 *  zonder dat duidelijk is waar we naar kijken. */
export function DeltaValue({ delta, decimals = 0, higherIsBetter = true, none }: {
  delta: Delta; decimals?: number; higherIsBetter?: boolean; none: string;
}) {
  const fmt = (v: number) => v.toLocaleString('nl-NL', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  if (delta.change === 0) {
    return <span className="tnum text-sm text-muted">{fmt(delta.after)} · {none}</span>;
  }
  const better = higherIsBetter ? delta.change > 0 : delta.change < 0;
  return (
    <span className="tnum text-sm">
      {fmt(delta.after)}{' '}
      <span className={better ? 'text-ok' : 'text-danger'}>
        ({delta.change > 0 ? '+' : ''}{fmt(delta.change)})
      </span>
    </span>
  );
}

export function SnapshotRow({ s, locale, snapshot, onRemove }: {
  s: Strings; locale: Locale; snapshot: ScanSnapshot; onRemove?: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{snapshot.label}</p>
        <p className="tnum text-xs text-muted">
          {datum(snapshot.savedAt, locale)} · {n(snapshot.productCount)} {s.upload.products}
          {snapshot.catalogName ? ` · ${snapshot.catalogName}` : ''}
        </p>
      </div>
      <div className="tnum text-right text-xs text-muted">
        <span className="block">{snapshot.avgAnswered.toFixed(1)} / {snapshot.avgApplicable.toFixed(0)}</span>
        <span className="block">{n(snapshot.findable)} {s.report.findable}</span>
      </div>
      <Badge tone="neutral">v{snapshot.scanVersion}</Badge>
      {onRemove ? (
        <Button variant="quiet" onClick={onRemove}>{s.pages.dashboard.remove}</Button>
      ) : null}
    </li>
  );
}

export function ComparisonView({ s, locale, comparison }: {
  s: Strings; locale: Locale; comparison: Comparison;
}) {
  const changed = comparison.scaleChanged;
  const redenen = [
    changed.scanVersion ? s.pages.dashboard.scaleScan : undefined,
    changed.fieldRegister ? s.pages.dashboard.scaleSpec : undefined,
    changed.questionSet ? s.pages.dashboard.scaleQuestions : undefined,
    changed.bank ? s.pages.dashboard.scaleBank : undefined,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* De waarschuwing staat boven de cijfers en niet eronder: wie eerst een
          plus ziet, leest de nuance daarna niet meer. */}
      {comparison.comparable ? (
        <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">{s.pages.dashboard.comparable}</p>
      ) : (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <p className="font-medium text-warn">{s.pages.dashboard.scaleWarning}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {s.pages.dashboard.scaleWarningBody} {redenen.join(', ')}.
          </p>
        </div>
      )}

      <Card>
        <CardTitle>{s.pages.dashboard.deltaHeading}</CardTitle>
        <dl className="grid gap-4 sm:grid-cols-4">
          {[
            { label: s.pages.dashboard.deltaQualified, delta: comparison.qualified, decimals: 0, up: true },
            { label: s.pages.dashboard.deltaFindable, delta: comparison.findable, decimals: 0, up: true },
            { label: s.pages.dashboard.deltaAvg, delta: comparison.avgAnswered, decimals: 1, up: true },
            { label: s.pages.dashboard.deltaUnmatched, delta: comparison.unmatched, decimals: 0, up: false },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted">{row.label}</dt>
              <dd>
                <DeltaValue
                  delta={row.delta}
                  decimals={row.decimals}
                  higherIsBetter={row.up}
                  none={s.pages.dashboard.noChange}
                />
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardTitle>{s.report.gapsHeading}</CardTitle>
        <ul className="space-y-2">
          {comparison.gaps.filter((gap) => gap.status !== 'unchanged').slice(0, 12).map((gap) => (
            <li key={`${gap.field}-${gap.cause}`} className="flex flex-wrap items-baseline gap-2">
              <Badge tone={gap.status === 'resolved' ? 'ok' : gap.status === 'new' ? 'danger' : 'warn'}>
                {gap.status === 'resolved' ? s.pages.dashboard.gapsResolved
                  : gap.status === 'new' ? s.pages.dashboard.gapsNew
                  : s.pages.dashboard.gapsChanged}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm">{gap.label[locale]}</span>
              <span className="tnum text-xs text-muted">
                {n(gap.affected.before)} → {n(gap.affected.after)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>{s.explorer.categoryHeading}</CardTitle>
        <ul className="space-y-2.5">
          {comparison.categories.slice(0, 8).map((category) => (
            <li key={category.setId}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm">
                  {category.category}
                  {category.presence !== 'both' ? (
                    <Badge tone="warn">{category.presence === 'only-after' ? '+' : '−'}</Badge>
                  ) : null}
                </span>
                <DeltaValue delta={category.avgAnswered} decimals={1} none={s.pages.dashboard.noChange} />
              </div>
              <div className="mt-1">
                <Bar value={category.avgAnswered.after} total={Math.max(category.avgAnswered.before, category.avgAnswered.after, 1)} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
