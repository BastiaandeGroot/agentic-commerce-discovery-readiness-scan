'use client';

// Stap 3: het rapport.
//
// De kop is een trechter, geen cijfer. Er staat met opzet nergens een
// gecombineerd Core/Selection-getal, en nergens een uitspraak over ranking —
// dat is een belofte over andermans black box en niet aan ons (S2).

import type { Locale, Protocol, ScanReport } from '../src/domain/types';
import { SPEC_SOURCES } from '../src/spec/snapshot';
import { UCP_TRUST_NOTE } from '../src/engine/checklists';
import type { Strings } from '../src/i18n/strings';
import { Badge, Bar, Button, Card, CardTitle, TrafficLight, statusOf } from './ui';
import { Explorer } from './Explorer';

const PROTOCOLS: Protocol[] = ['acp', 'ucp'];

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

function FunnelCard({ s, report, protocol }: { s: Strings; report: ScanReport; protocol: Protocol }) {
  const { funnel } = report.protocols[protocol];
  const status = statusOf(funnel.avgAnswered, funnel.avgApplicable);
  const rows = [
    { label: s.report.total, value: funnel.total, tone: 'neutral' as const, explain: undefined },
    { label: s.report.findable, value: funnel.findable, tone: 'accent' as const, explain: s.report.findableExplain },
    { label: s.report.competitive, value: funnel.competitive, tone: 'ok' as const, explain: s.report.competitiveExplain },
  ];

  return (
    <Card>
      <CardTitle>{s.report.protocolNames[protocol]}</CardTitle>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="tnum text-2xl font-semibold">{n(row.value)}</span>
              <span className="text-sm text-muted">{row.label}</span>
            </div>
            <div className="mt-1.5">
              <Bar value={row.value} total={funnel.total} tone={row.tone} />
            </div>
            {row.explain ? <p className="mt-1 text-xs text-muted">{row.explain}</p> : null}
          </div>
        ))}
      </div>
      {/* De trechter is binair en zegt vaak nul. Dit laat zien hoe ver een
          product komt, zonder te doen alsof gedeeltelijk ook goed is. */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center gap-3">
          <TrafficLight status={status} />
          <div className="min-w-0">
            <p className="font-medium">{s.report.status[status]}</p>
            <p className="tnum text-sm text-muted">
              {funnel.avgAnswered.toFixed(1)} {s.report.statusScale}{' '}
              {funnel.avgApplicable.toFixed(0)} {s.report.statusAnswered}
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          {s.report.statusExplain[status]}
        </p>
      </div>
    </Card>
  );
}

function QuestionCoverage({ s, report, protocol, locale }: {
  s: Strings; report: ScanReport; protocol: Protocol; locale: Locale;
}) {
  // Alleen de vragen die ergens knellen; een vraag die iedereen beantwoordt is
  // geen werklijst maar ruis.
  const rows = report.protocols[protocol].questionCoverage
    .filter((q) => q.answered < q.applicable)
    .slice(0, 14);
  const hasCatalog = report.sources.catalog !== undefined;

  if (rows.length === 0) return null;

  // Toon de categorienaam van de merchant, niet onze interne set-id.
  const categoryName = new Map(
    report.protocols[protocol].categories.map((c) => [c.setId, c.category]),
  );

  return (
    <Card>
      <CardTitle sub={s.report.questionsIntro}>
        {s.report.questionsHeading} — {s.report.protocolNames[protocol]}
      </CardTitle>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={`${row.setId}-${row.questionId}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm">{row.label[locale]}</span>
              <span className="tnum text-xs text-muted">
                {n(row.answered)}/{n(row.applicable)} {s.report.ofProducts}
              </span>
            </div>
            {/* Twee lagen: wat de feed beantwoordt, en wat het PIM alsnog kan
                aanvullen. Dat verschil bepaalt of dit doorzetwerk of invulwerk is. */}
            <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent"
                style={{ width: `${(row.answered / Math.max(row.applicable, 1)) * 100}%` }}
              />
              <div
                className="h-full bg-warn"
                style={{ width: `${(row.enrichable / Math.max(row.applicable, 1)) * 100}%` }}
              />
            </div>
            <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
              <span>{categoryName.get(row.setId) ?? row.setId}</span>
              <span className="tnum">
                <span className="text-accent">{n(row.answered)}</span> {s.report.fromFeed}
              </span>
              {hasCatalog && row.enrichable > 0 ? (
                <span className="tnum">
                  <span className="text-warn">{n(row.enrichable)}</span> {s.report.enrichable}
                </span>
              ) : null}
              <span className="tnum">
                {n(row.applicable - row.answered - row.enrichable)} {s.report.neither}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SelectionCard({ s, report, protocol, locale }: {
  s: Strings; report: ScanReport; protocol: Protocol; locale: Locale;
}) {
  const rows = report.protocols[protocol].selectionCoverage;
  return (
    <Card>
      <CardTitle>{s.report.selectionHeading} — {s.report.protocolNames[protocol]}</CardTitle>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm">{row.label[locale]}</span>
              <span className="tnum text-xs text-muted">{n(row.present)}/{n(row.total)}</span>
            </div>
            <div className="mt-1"><Bar value={row.present} total={row.total} tone="ok" /></div>
          </li>
        ))}
      </ul>
      {protocol === 'ucp' ? (
        <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
          {UCP_TRUST_NOTE[locale]}
        </p>
      ) : null}
    </Card>
  );
}

function OutWarnings({ s, report, locale }: { s: Strings; report: ScanReport; locale: Locale }) {
  const rows = PROTOCOLS.flatMap((protocol) =>
    report.protocols[protocol].outWarnings
      .filter((w) => w.affected > 0)
      .map((w) => ({ ...w, protocol })),
  );
  if (rows.length === 0) return null;

  return (
    <Card className="border-warn/40">
      <CardTitle sub={s.report.outIntro}>{s.report.outHeading}</CardTitle>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={`${row.protocol}-${row.id}`} className="rounded-lg bg-warn-soft p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <Badge tone="warn">{s.report.protocolNames[row.protocol]}</Badge>
              <span className="tnum font-semibold">{n(row.affected)}</span>
              <span className="text-sm">{s.report.notEligible} — {row.label[locale]}</span>
            </div>
            {row.note ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{row.note[locale]}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function GapTable({ s, report, locale }: { s: Strings; report: ScanReport; locale: Locale }) {
  // Voeg de gaps van beide protocollen samen op veld + oorzaak.
  const merged = new Map<string, {
    field: string; label: { nl: string; en: string };
    tier: string; cause: string; owner: string; affected: number;
  }>();
  for (const protocol of PROTOCOLS) {
    for (const gap of report.protocols[protocol].gaps) {
      const id = `${gap.field}|${gap.cause}`;
      const existing = merged.get(id);
      if (!existing || gap.affected > existing.affected) {
        merged.set(id, { ...gap });
      }
    }
  }
  const rows = [...merged.values()].sort((a, b) => b.affected - a.affected).slice(0, 25);
  if (rows.length === 0) return null;

  const causeTone = { mapping: 'accent', enrichment: 'warn', 'no-source': 'danger' } as const;

  return (
    <Card>
      <CardTitle sub={s.report.gapsIntro}>{s.report.gapsHeading}</CardTitle>

      {!report.sources.catalog ? (
        <p className="mb-4 rounded-md bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn">
          {s.report.noCatalogWarning}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">{s.report.gapField}</th>
              <th className="py-2 pr-3 font-medium">{s.report.gapTier}</th>
              <th className="py-2 pr-3 font-medium">{s.report.gapCause}</th>
              <th className="py-2 pr-3 font-medium">{s.report.gapOwner}</th>
              <th className="py-2 pr-3 font-medium">{s.report.gapCost}</th>
              <th className="py-2 text-right font-medium">{s.report.gapAffected}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.field}-${row.cause}`} className="border-b border-line/60">
                <td className="py-2 pr-3">{row.label[locale]}</td>
                <td className="py-2 pr-3">
                  <Badge tone={row.tier === 'core' ? 'accent' : 'neutral'}>
                    {s.report.tiers[row.tier]}
                  </Badge>
                </td>
                <td className="py-2 pr-3">
                  <Badge tone={causeTone[row.cause as keyof typeof causeTone]}>
                    {s.report.causes[row.cause]}
                  </Badge>
                  <span className="mt-0.5 block text-xs text-muted">
                    {s.report.causeMeaning[row.cause]}
                  </span>
                </td>
                <td className="py-2 pr-3 text-muted">{s.report.owners[row.owner]}</td>
                <td className="py-2 pr-3 text-muted">{s.report.causeCost[row.cause]}</td>
                <td className="tnum py-2 text-right">{n(row.affected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ReportView({ s, locale, report, onRestart }: {
  s: Strings; locale: Locale; report: ScanReport; onRestart: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.report.perProtocol}>{s.report.funnelHeading}</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {PROTOCOLS.map((protocol) => (
            <FunnelCard key={protocol} s={s} report={report} protocol={protocol} />
          ))}
        </div>
        <p className="mt-4 rounded-md bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
          {s.report.noBlend}
        </p>
        {report.unmatchedCount > 0 ? (
          <div className="mt-3 rounded-md bg-warn-soft px-3 py-2">
            <p className="text-sm">
              <span className="tnum font-semibold">{n(report.unmatchedCount)}</span>{' '}
              {s.report.unmatched}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.report.unmatchedExplain}</p>
          </div>
        ) : null}
      </Card>

      <OutWarnings s={s} report={report} locale={locale} />

      <div className="grid gap-4 lg:grid-cols-2">
        {PROTOCOLS.map((protocol) => (
          <QuestionCoverage key={protocol} s={s} report={report} protocol={protocol} locale={locale} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROTOCOLS.map((protocol) => (
          <SelectionCard key={protocol} s={s} report={report} protocol={protocol} locale={locale} />
        ))}
      </div>

      <GapTable s={s} report={report} locale={locale} />

      <Explorer s={s} locale={locale} report={report} />

      <Card>
        <CardTitle sub={s.report.stampExplain}>{s.report.stampHeading}</CardTitle>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">{s.report.specSnapshot}</dt>
            <dd className="tnum font-medium">{report.stamp.specSnapshot}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.questionVersion}</dt>
            <dd className="tnum font-medium">v{report.stamp.questionSetVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.scannedAt}</dt>
            <dd className="tnum font-medium">
              {new Date(report.stamp.scannedAt).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}
            </dd>
          </div>
        </dl>
        <ul className="mt-4 space-y-1 text-xs text-muted">
          {SPEC_SOURCES.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="text-xs leading-relaxed text-muted">{s.report.disclaimer}</p>
      </Card>

      <Button variant="secondary" onClick={onRestart}>{s.report.startOver}</Button>
    </div>
  );
}
