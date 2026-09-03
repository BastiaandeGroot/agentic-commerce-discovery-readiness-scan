'use client';

// Stap 3: het rapport.
//
// De kop is een trechter, geen cijfer. Er staat met opzet nergens een
// gecombineerd Core/Selection-getal, en nergens een uitspraak over ranking —
// dat is een belofte over andermans black box en niet aan ons (S2).

import { useMemo, useState } from 'react';
import type { Locale, Protocol, ScanReport } from '../src/domain/types';
import { SPEC_SOURCES } from '../src/spec/snapshot';
import { UCP_TRUST_NOTE } from '../src/engine/checklists';
import type { Strings } from '../src/i18n/strings';
import { Badge, Bar, Button, Card, CardTitle, InfoButton, InfoPanel, Select, TrafficLight, statusOf } from './ui';
import { Explorer } from './Explorer';

const PROTOCOLS: Protocol[] = ['acp', 'ucp'];

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

function FunnelCard({ s, report, protocol }: { s: Strings; report: ScanReport; protocol: Protocol }) {
  const { funnel } = report.protocols[protocol];
  const status = statusOf(funnel.avgAnswered, funnel.avgApplicable);
  // Eén uitleg tegelijk open: twee tegelijk maakt de kaart onleesbaar.
  const [openInfo, setOpenInfo] = useState<string>();
  const rows = [
    { label: s.report.total, value: funnel.total, tone: 'neutral' as const, explain: undefined, info: undefined },
    {
      label: s.report.findable, value: funnel.findable, tone: 'accent' as const,
      explain: s.report.findableExplain, info: s.report.findableInfo,
    },
    {
      label: s.report.competitive, value: funnel.competitive, tone: 'ok' as const,
      explain: s.report.competitiveExplain, info: s.report.competitiveInfo,
    },
  ];

  return (
    <Card>
      <CardTitle>{s.report.protocolNames[protocol]}</CardTitle>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="tnum text-2xl font-semibold">{n(row.value)}</span>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                {row.label}
                {row.info ? (
                  <InfoButton
                    label={s.report.infoLabel}
                    open={openInfo === row.label}
                    onToggle={() => setOpenInfo(openInfo === row.label ? undefined : row.label)}
                  />
                ) : null}
              </span>
            </div>
            <div className="mt-1.5">
              <Bar value={row.value} total={funnel.total} tone={row.tone} />
            </div>
            {row.explain ? <p className="mt-1 text-xs text-muted">{row.explain}</p> : null}
            {row.info && openInfo === row.label ? <InfoPanel>{row.info}</InfoPanel> : null}
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

/**
 * Waar begin je?
 *
 * De trechter is binair en zegt bij de meeste merchants nul. Dat leest als een
 * dichte deur terwijl er al veel staat. Dit blok laat de afstand zien en wat de
 * eerstvolgende stap oplevert — zonder de lat te verlagen, want vindbaar blijft
 * alle vragen beantwoord. Het is een richting, geen zachter cijfer.
 */
function NextStep({ s, report, protocol, locale }: {
  s: Strings; report: ScanReport; protocol: Protocol; locale: Locale;
}) {
  const { funnel, distance, questionCoverage } = report.protocols[protocol];

  // De dichtstbijzijnde stand die nog niet vindbaar is.
  const nearest = distance.find((bucket) => bucket.open > 0);

  // Welke vragen houden de meeste producten tegen? Tel over alle sets heen, want
  // dezelfde vraag komt in meerdere categorieën terug.
  const blockers = new Map<string, { label: string; open: number; enrichable: number; ids: Set<string> }>();
  for (const row of questionCoverage) {
    const open = row.applicable - row.answered;
    if (open === 0) continue;
    const key = row.label[locale];
    const entry = blockers.get(key) ?? { label: key, open: 0, enrichable: 0, ids: new Set<string>() };
    entry.open += open;
    entry.enrichable += row.enrichable;
    entry.ids.add(row.questionId);
    blockers.set(key, entry);
  }
  const top = [...blockers.values()].sort((a, b) => b.open - a.open).slice(0, 2);

  // Wat levert het op als juist die vragen beantwoord worden? Een product wordt
  // vindbaar als er daarna niets meer openstaat.
  const topIds = new Set(top.flatMap((entry) => [...entry.ids]));
  const wouldBecome = report.products.filter((product) => {
    if (product.unmatched) return false;
    const open = product.perProtocol[protocol].questions.filter((q) => !q.answered);
    return open.length > 0 && open.every((q) => topIds.has(q.questionId));
  }).length;

  if (top.length === 0) return null;

  return (
    <Card>
      <CardTitle sub={s.report.startIntro}>
        {s.report.startHeading} — {s.report.protocolNames[protocol]}
      </CardTitle>

      <p className="text-sm leading-relaxed">
        {funnel.findable === 0 ? (
          s.report.startNoneFindable
        ) : (
          <><span className="tnum font-semibold">{n(funnel.findable)}</span> {s.report.startSomeFindable}</>
        )}
        {nearest ? (
          <>
            {' '}{s.report.startNearest}{' '}
            <span className="tnum font-semibold">{n(nearest.products)}</span>{' '}
            {s.report.startNearestProducts}{' '}
            <span className="tnum font-semibold">{nearest.open}</span>{' '}
            {s.report.startNearestQuestions}
          </>
        ) : null}
      </p>

      <div className="mt-4">
        <h3 className="text-xs font-medium text-muted">{s.report.startBlockersHeading}</h3>
        <ul className="mt-1.5 space-y-1.5">
          {top.map((entry) => (
            <li key={entry.label} className="text-sm">
              <span className="font-medium">{entry.label}</span>
              <span className="tnum ml-2 text-xs text-muted">
                {n(entry.open)} {s.report.startBlockerOpen}
                {entry.enrichable > 0
                  ? <>, <span className="text-warn">{n(entry.enrichable)}</span> {s.report.startBlockerPim}</>
                  : <>, {s.report.startBlockerNowhere}</>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-md bg-surface-2 px-3 py-2.5">
        <h3 className="text-xs font-medium text-muted">{s.report.startWinHeading}</h3>
        {wouldBecome > 0 ? (
          <p className="mt-1 text-sm leading-relaxed">
            {s.report.startWinBody}{' '}
            <span className="tnum font-semibold text-accent">{n(wouldBecome)}</span>{' '}
            {s.report.startWinProducts}
          </p>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-muted">{s.report.startWinNone}</p>
        )}
      </div>
    </Card>
  );
}

function QuestionCoverage({ s, report, protocol, locale }: {
  s: Strings; report: ScanReport; protocol: Protocol; locale: Locale;
}) {
  const [setId, setSetId] = useState('all');
  const hasCatalog = report.sources.catalog !== undefined;
  const categories = report.protocols[protocol].categories;

  // Toon de categorienaam van de merchant, niet onze interne set-id.
  const categoryName = new Map(categories.map((c) => [c.setId, c.category]));

  // Beste eerst. Een merchant leest dan van boven naar beneden af waar hij al
  // ver is en waar het werk begint, in plaats van meteen tegen het slechtste
  // nieuws aan te kijken.
  const rows = report.protocols[protocol].questionCoverage
    .filter((q) => q.answered < q.applicable)
    .filter((q) => setId === 'all' || q.setId === setId)
    .sort(
      (a, b) => b.answered / Math.max(b.applicable, 1) - a.answered / Math.max(a.applicable, 1),
    );

  // Zonder categoriekeuze zou de lijst over alle sets heen te lang worden; met
  // een gekozen categorie hoort hij compleet te zijn.
  const shown = setId === 'all' ? rows.slice(0, 14) : rows;

  if (report.protocols[protocol].questionCoverage.length === 0) return null;

  return (
    <Card>
      <CardTitle sub={s.report.questionsIntro}>
        {s.report.questionsHeading} — {s.report.protocolNames[protocol]}
      </CardTitle>

      {categories.length > 1 ? (
        <div className="mb-3">
          <Select
            label={s.report.filterCategory}
            value={setId}
            onChange={setSetId}
            options={[
              { value: 'all', label: s.report.allCategories },
              ...categories.map((c) => ({ value: c.setId, label: `${c.category} (${n(c.total)})` })),
            ]}
          />
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-sm text-muted">{s.report.allAnswered}</p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((row) => (
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
      )}
    </Card>
  );
}

function SelectionCard({ s, report, protocol, locale }: {
  s: Strings; report: ScanReport; protocol: Protocol; locale: Locale;
}) {
  const [setId, setSetId] = useState('all');
  const categories = report.protocols[protocol].categories;

  // Per categorie tellen we opnieuw uit de producten zelf. De checklist is voor
  // elk product dezelfde, maar hoe vaak hij gehaald wordt verschilt per
  // categorie — en daar kiest een merchant waar hij begint.
  const rows = useMemo(() => {
    const members = report.products.filter(
      (product) => !product.unmatched && (setId === 'all' || product.setId === setId),
    );
    const base = report.protocols[protocol].selectionCoverage;
    if (setId === 'all') return base;
    return base.map((item) => ({
      ...item,
      present: members.filter(
        (product) => product.perProtocol[protocol].selection.find((x) => x.id === item.id)?.present,
      ).length,
      total: members.length,
    }));
  }, [report, protocol, setId]);

  return (
    <Card>
      <CardTitle>{s.report.selectionHeading} — {s.report.protocolNames[protocol]}</CardTitle>

      {categories.length > 1 ? (
        <div className="mb-3">
          <Select
            label={s.report.filterCategory}
            value={setId}
            onChange={setSetId}
            options={[
              { value: 'all', label: s.report.allCategories },
              ...categories.map((c) => ({ value: c.setId, label: `${c.category} (${n(c.total)})` })),
            ]}
          />
        </div>
      ) : null}

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
  // Eén kolomuitleg tegelijk; twee open panelen boven een tabel is onleesbaar.
  const [openInfo, setOpenInfo] = useState<string>();

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

  const columns: { id: string; label: string; align?: string }[] = [
    { id: 'field', label: s.report.gapField },
    { id: 'tier', label: s.report.gapTier },
    { id: 'cause', label: s.report.gapCause },
    { id: 'affected', label: s.report.gapAffected, align: 'text-right' },
  ];

  return (
    <Card>
      <CardTitle sub={s.report.gapsIntro}>{s.report.gapsHeading}</CardTitle>

      {/* Waarom deze tabel er staat, en wat de drie uitkomsten aan werk betekenen.
          Zonder die uitleg is "verrijkingsgat" een woord en geen keuze. */}
      <p className="rounded-md bg-surface-2 px-3 py-2 text-sm leading-relaxed text-muted">
        {s.report.gapsWhy}
      </p>

      {!report.sources.catalog ? (
        <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn">
          {s.report.noCatalogWarning}
        </p>
      ) : null}

      {/* De uitleg staat boven de tabel en niet in de cel: een paneel binnen een
          scrollende tabel verdwijnt half achter de rand. */}
      {openInfo ? <InfoPanel>{s.report.gapColumnInfo[openInfo]}</InfoPanel> : null}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th key={column.id} className={`py-2 pr-3 font-medium ${column.align ?? ''}`}>
                  <span className={`inline-flex items-center gap-1.5 ${column.align ? 'justify-end' : ''}`}>
                    {column.label}
                    <InfoButton
                      label={s.report.infoLabel}
                      open={openInfo === column.id}
                      onToggle={() => setOpenInfo(openInfo === column.id ? undefined : column.id)}
                    />
                  </span>
                </th>
              ))}
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
                  <span className="mt-0.5 block text-xs text-muted">
                    {s.report.tierMeaning[row.tier]}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <Badge tone={causeTone[row.cause as keyof typeof causeTone]}>
                    {s.report.causes[row.cause]}
                  </Badge>
                  <span className="mt-0.5 block text-xs text-muted">
                    {s.report.causeMeaning[row.cause]}
                  </span>
                </td>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {PROTOCOLS.map((protocol) => (
          <NextStep key={protocol} s={s} report={report} protocol={protocol} locale={locale} />
        ))}
      </div>

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

      {/* Checkout komt bewust na alle datasecties: eerst of de productdata de
          vragen van een koper beantwoordt, dan pas of er afgerekend kan worden. */}
      <OutWarnings s={s} report={report} locale={locale} />

      <Card>
        <CardTitle sub={s.report.stampExplain}>{s.report.stampHeading}</CardTitle>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{s.report.scanVersion}</dt>
            <dd className="tnum font-medium">v{report.stamp.scanVersion}</dd>
          </div>
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

      {/* Delen zonder dat er data weggaat: afdrukken doet de browser zelf. De
          knop verdwijnt in de afdruk, want daar kun je niet op klikken. */}
      <Card>
        <p className="text-sm leading-relaxed text-muted">{s.report.shareNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>{s.report.printReport}</Button>
          <Button variant="quiet" onClick={onRestart}>{s.report.startOver}</Button>
        </div>
      </Card>
    </div>
  );
}
