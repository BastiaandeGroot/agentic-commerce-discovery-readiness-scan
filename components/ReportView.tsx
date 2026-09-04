'use client';

// Stap 3: het rapport.
//
// De kop is een trechter en geen cijfer, en er staat nergens een uitspraak over
// ranking — dat is een belofte over andermans black box en niet aan ons. Wat
// hier gemeten wordt is één ding: kan de catalogus de vragen beantwoorden die
// een koper in deze markt stelt.

import { useState } from 'react';
import { toSnapshot } from '../src/engine/snapshot';
import { LOCAL_ACCOUNT, snapshotStore } from '../src/storage/snapshots';
import type { Locale, ScanReport } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import { Badge, Bar, Button, Card, CardTitle, InfoButton, InfoPanel, Select, TrafficLight, statusOf } from './ui';
import { Explorer } from './Explorer';

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

function FunnelCard({ s, report }: { s: Strings; report: ScanReport }) {
  const { funnel } = report;
  const status = statusOf(funnel.avgAnswered, funnel.avgApplicable);
  // Eén uitleg tegelijk open: twee tegelijk maakt de kaart onleesbaar.
  const [openInfo, setOpenInfo] = useState<string>();
  // Kent deze catalogus geen enkele kritieke vraag, dan is de eerste trede leeg
  // en zegt hij niets. Dat gebeurt bij een voorlopige bank: welke fout in deze
  // markt onomkeerbaar is, volgt uit onderzoek. Hem dan stilzwijgend op "iedereen
  // geslaagd" zetten zou een poort suggereren die er niet is.
  const hasCritical = report.questionCoverage
    .some((row) => row.scored && row.importance === 'critical');

  const rows = [
    { label: s.report.total, value: funnel.total, tone: 'neutral' as const, explain: undefined, info: undefined },
    {
      label: s.report.qualified, value: funnel.qualified, tone: 'warn' as const,
      explain: hasCritical ? s.report.qualifiedExplain : s.report.qualifiedNoCritical,
      info: s.report.qualifiedInfo,
    },
    {
      label: s.report.findable, value: funnel.findable, tone: 'ok' as const,
      explain: s.report.findableExplain, info: s.report.findableInfo,
    },
  ];

  return (
    <Card>
      <CardTitle>{s.report.funnelHeading}</CardTitle>
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
            {/* Twee schalen naast elkaar. Het aantal vragen is meteen te
                bevatten; de punten zeggen wat het waard is, want een kritieke
                vraag weegt vijf keer een lage. */}
            <p className="tnum text-xs text-muted">
              {s.report.avgPointsLine} {funnel.avgEarned.toFixed(1)} {s.report.statusScale}{' '}
              {funnel.avgWeight.toFixed(0)} {s.report.points}
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
function NextStep({ s, report, locale }: {
  s: Strings; report: ScanReport; locale: Locale;
}) {
  const { funnel, distance, questionCoverage } = report;

  // De dichtstbijzijnde stand die nog niet vindbaar is.
  const nearest = distance.find((bucket) => bucket.open > 0);

  // Welke vragen houden de meeste producten tegen? Tel over alle sets heen, want
  // dezelfde vraag komt in meerdere categorieën terug.
  const blockers = new Map<string, { label: string; open: number; empty: number; ids: Set<string> }>();
  for (const row of questionCoverage) {
    if (!row.scored) continue;
    const open = row.applicable - row.answered;
    if (open === 0) continue;
    const key = row.label[locale];
    const entry = blockers.get(key) ?? { label: key, open: 0, empty: 0, ids: new Set<string>() };
    entry.open += open;
    // Waar het veld al bestaat is dit invulwerk, en dat is de goedkoopste winst
    // die er is. Dat onderscheid hoort in de eerste zin die een merchant leest.
    entry.empty += row.empty;
    entry.ids.add(row.questionId);
    blockers.set(key, entry);
  }
  const top = [...blockers.values()].sort((a, b) => b.open - a.open).slice(0, 2);

  // Wat levert het op als juist die vragen beantwoord worden? Een product wordt
  // vindbaar als er daarna niets meer openstaat.
  const topIds = new Set(top.flatMap((entry) => [...entry.ids]));
  const wouldBecome = report.products.filter((product) => {
    if (product.unmatched) return false;
    const open = product.questions.filter((q) => q.scored && !q.answered);
    return open.length > 0 && open.every((q) => topIds.has(q.questionId));
  }).length;

  if (top.length === 0) return null;

  return (
    <Card>
      <CardTitle sub={s.report.startIntro}>{s.report.startHeading}</CardTitle>

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
                {entry.empty > 0
                  ? <>, <span className="text-warn">{n(entry.empty)}</span> {s.report.startBlockerPim}</>
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

function QuestionCoverageCard({ s, report, locale }: {
  s: Strings; report: ScanReport; locale: Locale;
}) {
  const [setId, setSetId] = useState('all');
  const categories = report.categories;

  // Toon de categorienaam van de merchant, niet onze interne set-id.
  const categoryName = new Map(categories.map((c) => [c.setId, c.category]));

  // Beste eerst. Een merchant leest dan van boven naar beneden af waar hij al
  // ver is en waar het werk begint, in plaats van meteen tegen het slechtste
  // nieuws aan te kijken.
  const rows = report.questionCoverage
    .filter((q) => q.scored)
    .filter((q) => q.answered < q.applicable)
    .filter((q) => setId === 'all' || q.setId === setId)
    .sort(
      (a, b) => b.answered / Math.max(b.applicable, 1) - a.answered / Math.max(a.applicable, 1),
    );

  // Zonder categoriekeuze zou de lijst over alle sets heen te lang worden; met
  // een gekozen categorie hoort hij compleet te zijn.
  const shown = setId === 'all' ? rows.slice(0, 14) : rows;

  if (report.questionCoverage.length === 0) return null;

  return (
    <Card>
      <CardTitle sub={s.report.questionsIntro}>{s.report.questionsHeading}</CardTitle>

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
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  {/* Het gewicht staat vóór de vraag: het bepaalt of dit de
                      eerste trede van de trechter blokkeert of alleen de laatste. */}
                  {row.importance === 'critical' ? (
                    <Badge tone="danger">{s.questions.importance.critical}</Badge>
                  ) : null}
                  <span className="min-w-0">{row.label[locale]}</span>
                </span>
                <span className="tnum text-xs text-muted">
                  {n(row.answered)}/{n(row.applicable)} {s.report.ofProducts}
                </span>
              </div>
              {/* Vier lagen: beantwoord, verborgen in het PIM, gevuld maar te
                  mager, en deels aanwezig. Elke laag wijst naar ander werk —
                  mappen, herschrijven of aanvullen — en op één hoop gooien levert
                  een lijst op waar niemand mee verder kan. */}
              <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${(row.answered / Math.max(row.applicable, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-warn"
                  style={{ width: `${(row.empty / Math.max(row.applicable, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-warn/50"
                  style={{ width: `${((row.unusable + row.incomplete) / Math.max(row.applicable, 1)) * 100}%` }}
                />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                <span>{categoryName.get(row.setId) ?? row.setId}</span>
                <span className="tnum">
                  <span className="text-accent">{n(row.answered)}</span> {s.report.fromFeed}
                </span>
                {row.empty > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.empty}>
                    <span className="text-warn">{n(row.empty)}</span> {s.report.enrichable}
                  </span>
                ) : null}
                {row.unusable > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.unusable}>
                    {n(row.unusable)} {s.report.states.unusable.toLowerCase()}
                  </span>
                ) : null}
                {row.incomplete > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.incomplete}>
                    {n(row.incomplete)} {s.report.states.incomplete.toLowerCase()}
                  </span>
                ) : null}
                <span className="tnum" title={s.report.statesExplain.absent}>
                  {n(row.absent)} {s.report.neither}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GapTable({ s, report, locale }: { s: Strings; report: ScanReport; locale: Locale }) {
  // Eén kolomuitleg tegelijk; twee open panelen boven een tabel is onleesbaar.
  const [openInfo, setOpenInfo] = useState<string>();

  const merged = new Map<string, {
    field: string; label: { nl: string; en: string };
    cause: string; owner: string; affected: number; questions: string[];
  }>();
  {
    for (const gap of report.gaps) {
      const id = `${gap.field}|${gap.cause}`;
      const existing = merged.get(id);
      if (!existing || gap.affected > existing.affected) {
        merged.set(id, { ...gap });
      }
    }
  }
  const rows = [...merged.values()].sort((a, b) => b.affected - a.affected).slice(0, 25);
  if (rows.length === 0) return null;

  const causeTone = { unfilled: 'accent', unmodelled: 'warn', 'no-source': 'danger' } as const;

  const columns: { id: string; label: string; align?: string }[] = [
    { id: 'field', label: s.report.gapField },
    { id: 'questions', label: s.report.gapQuestions },
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
                  {/* Welke vragen hierdoor blijven liggen. Een gat zonder vraag
                      bestaat niet: dat is het verschil met een lege-veldenlijst. */}
                  <span className="text-xs text-muted">{row.questions.length}</span>
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

/**
 * Buiten de score.
 *
 * Dit zijn vragen die een koper wel stelt maar die geen enkel productattribuut
 * kan beantwoorden: kan ik een staal krijgen, welke kleuren bestaan er nog in
 * deze kwaliteit. Ze meetellen zou elke merchant op hetzelfde punt laten zakken
 * en daarmee de meting vertekenen. Ze weglaten zou het waardevolste advies uit
 * het rapport halen — juist hier ligt het antwoord bij de website of de
 * klantenservice, en niet bij de catalogus.
 */
function Advisory({ s, report, locale }: { s: Strings; report: ScanReport; locale: Locale }) {
  // Ontdubbeld op vraag, met de categorieën erachter: dezelfde procesvraag komt
  // in meerdere categorieën terug en hoeft maar één keer als advies te staan.
  const seen = new Map<string, { label: string; importance: string; categories: Set<string> }>();
  const categories = new Map(report.categories.map((c) => [c.setId, c.category]));
  for (const row of report.advisory) {
    const entry = seen.get(row.questionId)
      ?? { label: row.label[locale], importance: row.importance, categories: new Set<string>() };
    entry.categories.add(categories.get(row.setId) ?? row.setId);
    seen.set(row.questionId, entry);
  }
  if (seen.size === 0) return null;

  return (
    <Card>
      <CardTitle sub={s.report.advisoryIntro}>{s.report.advisoryHeading}</CardTitle>
      <ul className="space-y-2">
        {[...seen.entries()].map(([id, entry]) => (
          <li key={id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-2">
            <Badge tone="neutral">{s.questions.importance[entry.importance]}</Badge>
            <span className="min-w-0 flex-1 text-sm">{entry.label}</span>
            <span className="text-xs text-muted">{[...entry.categories].join(', ')}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ReportView({ s, locale, report, onRestart, restartLabel, canSave = true }: {
  s: Strings;
  locale: Locale;
  report: ScanReport;
  onRestart: () => void;
  /** Op /demo is de weg terug niet "nieuwe scan" maar "doe dit zelf". */
  restartLabel?: string;
  /** Een voorbeeldrapport hoort niet tussen je eigen scans te belanden. */
  canSave?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  async function save() {
    // Alleen de uitkomst gaat de opslag in, niet de producten of het bronbestand.
    await snapshotStore.save(
      toSnapshot(report, {
        id: `${report.stamp.scannedAt}-${report.sources.catalog.filename}`,
        accountId: LOCAL_ACCOUNT,
        savedAt: new Date().toISOString(),
        label: report.sources.catalog.filename,
      }),
    );
    setSaved(true);
  }

  const provisional = report.stamp.banks.filter((bank) => bank.status !== 'frozen');

  return (
    <div className="space-y-4">
      {/* Bovenaan en niet in het stempel onderaan: wie een cijfer leest hoort
          meteen te weten dat de lat beredeneerd is en niet onderzocht. */}
      {provisional.length > 0 ? (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <p className="font-medium text-warn">
            {s.report.bankHeading}: {provisional.map((bank) => bank.label[locale]).join(', ')}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{s.report.bankProvisional}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard s={s} report={report} />
        <NextStep s={s} report={report} locale={locale} />
      </div>

      {report.unmatchedCount > 0 ? (
        <div className="rounded-md bg-warn-soft px-3 py-2">
          <p className="text-sm">
            <span className="tnum font-semibold">{n(report.unmatchedCount)}</span>{' '}
            {s.report.unmatched}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.report.unmatchedExplain}</p>
        </div>
      ) : null}

      <QuestionCoverageCard s={s} report={report} locale={locale} />

      <GapTable s={s} report={report} locale={locale} />

      <Explorer s={s} locale={locale} report={report} />

      {/* Vragen die geen enkel attribuut kan dragen. Ze staan ná de meting: het
          is advies over je website en je dienstverlening, geen bevinding over je
          catalogus. */}
      <Advisory s={s} report={report} locale={locale} />

      <Card>
        <CardTitle sub={s.report.stampExplain}>{s.report.stampHeading}</CardTitle>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{s.report.scanVersion}</dt>
            <dd className="tnum font-medium">v{report.stamp.scanVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.specSnapshot}</dt>
            <dd className="tnum font-medium">{report.stamp.fieldRegister}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.bankVersion}</dt>
            <dd className="font-medium">
              {report.stamp.banks.length === 0 ? '—' : report.stamp.banks.map((bank) => (
                <span key={bank.id} className="mr-2 inline-flex items-center gap-1.5">
                  <span className="tnum">{bank.label[locale]} {bank.version}</span>
                  {bank.status !== 'frozen' ? (
                    <Badge tone="warn">{s.bank.status[bank.status]}</Badge>
                  ) : null}
                </span>
              ))}
            </dd>
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
      </Card>

      <Card>
        <p className="text-xs leading-relaxed text-muted">{s.report.disclaimer}</p>
      </Card>

      {/* Delen zonder dat er data weggaat: afdrukken doet de browser zelf. De
          knop verdwijnt in de afdruk, want daar kun je niet op klikken. */}
      <Card>
        <p className="text-sm leading-relaxed text-muted">{s.report.shareNote}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canSave ? (
            <Button variant="secondary" onClick={() => void save()} disabled={saved}>
              {saved ? s.report.savedScan : s.report.saveScan}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => window.print()}>{s.report.printReport}</Button>
          <Button variant="quiet" onClick={onRestart}>{restartLabel ?? s.report.startOver}</Button>
        </div>
      </Card>
    </div>
  );
}
