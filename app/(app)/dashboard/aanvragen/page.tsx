'use client';

// Het beheerscherm: wie er wacht, en wat er vrijgegeven moet worden.
//
// In het dashboard dat er al is en niet in een apart portaal. Dezelfde login,
// dezelfde vormgeving, dezelfde codebase — en er is één beheerder, dus een
// tweede applicatie zou zichzelf niet terugverdienen.
//
// Wie het mag zien wordt serverzijdig bepaald. Dit scherm toont hoogstens wat de
// route teruggeeft; ziet iemand hem toch, dan krijgt hij een lege lijst en een
// melding, niet andermans gegevens.

import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorState, SkeletonLines, TableWrap, Td, Th } from '../../../../components/ui';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { authHeader } from '../../../../src/auth/client';

interface RequestRow {
  id: string; vertical: string; status: string;
  site_url?: string; suggested_sites?: string[]; segments?: { name: string; count: number }[];
  panel?: { name?: string; url?: string }[];
  requested_at: string; failure?: string; bank_id?: string;
  waitingHours: number; overdue: boolean;
}

interface ReviewedQuestion {
  id: string; label: { nl: string; en: string }; category?: string;
  layer: 'base' | 'overlay'; importance: string;
  attributes: { key: string; mapped: boolean }[];
  coverage: number | null;
  issues: string[]; severity: number;
}

interface BankSummary {
  questions: number; withCoverage: number; panelSize: number;
  attributes: number; attributesMapped: number;
}

interface BankRow {
  id: string; vertical: string; version: number; status: string;
  findings: string[]; panel: { name?: string; url?: string; type?: string; consultedAt?: string }[];
  questions: ReviewedQuestion[];
  summary?: BankSummary;
  /** Vragen die de beheerder bij het vrijgeven overslaat. Terugdraaibaar. */
  excluded?: string[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'failed' }
  | { kind: 'ready'; requests: RequestRow[]; banks: BankRow[] };

export default function Page() {
  const [locale] = useLocale();
  const s = STRINGS[locale];
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState<string>();
  /** Standaard alleen wat bezwaren heeft; de rest is één klik weg. */
  const [onlyIssues, setOnlyIssues] = useState(true);
  /**
   * Welke bevinding er uitgeklapt staat.
   *
   * Eén tegelijk, en per vraag: een label alleen zegt wát er is en niet waaróm
   * het uitmaakt, en dat tweede is precies wat een beheerder nodig heeft om te
   * beslissen of hij vrijgeeft.
   */
  const [openIssue, setOpenIssue] = useState<string>();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/queue', { headers: await authHeader() });
      if (response.status === 403) { setState({ kind: 'denied' }); return; }
      if (!response.ok) { setState({ kind: 'failed' }); return; }
      const data = await response.json();
      setState({ kind: 'ready', requests: data.requests ?? [], banks: data.banks ?? [] });
    } catch {
      setState({ kind: 'failed' });
    }
  }, []);

  useEffect(() => {
    // Na de render; een setState in het lichaam van een effect lokt een extra
    // render uit voordat deze klaar is.
    void (async () => { await Promise.resolve(); await load(); })();
  }, [load]);

  /** Een vraag overslaan of weer meenemen. Meteen bewaard, dus terugdraaibaar. */
  async function toggle(bankId: string, questionId: string) {
    setBusy(`${bankId}:${questionId}`);
    try {
      await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'toggle', bankId, questionId }),
      });
      await load();
    } finally {
      setBusy(undefined);
    }
  }

  async function release(bankId: string) {
    setBusy(bankId);
    try {
      await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ bankId }),
      });
      await load();
    } finally {
      setBusy(undefined);
    }
  }

  /** Wachttijd in de eenheid die klopt: uren tot een dag, daarna dagen. */
  function waited(hours: number): string {
    if (hours < 1) return s.admin.lessThanHour;
    return hours < 48 ? `${hours} ${s.admin.hours}` : `${Math.floor(hours / 24)} ${s.admin.days}`;
  }

  if (state.kind === 'loading') {
    return <Card><SkeletonLines lines={4} /></Card>;
  }
  if (state.kind === 'denied') {
    return <Card><ErrorState title={s.admin.denied} body={s.admin.deniedBody} /></Card>;
  }
  if (state.kind === 'failed') {
    return <Card><ErrorState title={s.admin.failed} body={s.admin.failedBody} action={{ label: s.admin.release, onClick: () => void load() }} /></Card>;
  }

  const open = state.requests.filter((one) => one.status !== 'ready');
  const review = state.banks.filter((one) => one.status === 'review');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.admin.heading}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.admin.intro}</p>
      </div>

      <Card>
        <CardTitle>{s.admin.waiting}</CardTitle>
        {open.length === 0 ? (
          <EmptyState title={s.admin.noWaiting} body={s.admin.noWaitingBody} />
        ) : (
          <ul>
            {open.map((one) => (
              <li key={one.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line py-2.5 first:border-t-0">
                <span className="font-medium">{one.vertical}</span>
                <Badge tone={one.status === 'failed' ? 'danger' : one.overdue ? 'warn' : 'neutral'}>
                  {s.admin.statuses[one.status] ?? one.status}
                </Badge>
                {/* De wachttijd is wat een beheerder wil weten: niet wanneer hij
                    binnenkwam maar hoe lang iemand al zit te wachten. */}
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Clock className="size-3.5" aria-hidden />
                  {s.admin.waitingSince} {waited(one.waitingHours)}
                </span>
                {one.overdue ? <Badge tone="warn">{s.admin.overdue}</Badge> : null}
                <span className="w-full text-xs leading-relaxed text-muted">
                  {one.segments?.length ?? 0} {s.admin.segments}
                  {one.site_url ? ` · ${s.admin.shop}: ${one.site_url}` : ''}
                  {one.suggested_sites?.length ? ` · ${s.admin.suggested}: ${one.suggested_sites.join(', ')}` : ''}
                  {one.panel?.length
                    ? ` · ${s.admin.panel}: ${one.panel.map((site) => site.name ?? site.url).join(', ')}`
                    : ''}
                </span>
                {one.failure ? (
                  <span className="w-full text-xs leading-relaxed text-danger">{one.failure}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle sub={s.admin.releaseNote}>{s.admin.review}</CardTitle>
        {review.length === 0 ? (
          <EmptyState title={s.admin.noReview} body={s.admin.noReviewBody} />
        ) : (
          <ul className="flex flex-col gap-4">
            {review.map((bank) => (
              <li key={bank.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{bank.vertical} v{bank.version}</span>
                  <Badge tone={bank.findings.length > 0 ? 'warn' : 'ok'}>
                    {bank.findings.length > 0
                      ? `${bank.findings.length} ${s.admin.findings}`
                      : s.admin.noFindings}
                  </Badge>
                </div>

                {/* Welke sites er werkelijk zijn doorgenomen. Een eigen blok en
                    geen regeltje achteraan: dit is waarop de hele bank rust, en
                    de merchant krijgt dezelfde lijst te zien. */}
                <div className="mt-3 rounded-lg bg-surface-2 p-3">
                  <p className="text-sm font-medium">{s.admin.panel}</p>
                  {bank.panel.length > 0 ? (
                    <>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.admin.panelBody}</p>
                      <ul className="mt-2 flex flex-col gap-1">
                        {bank.panel.map((site) => (
                          <li key={site.url ?? site.name} className="text-sm text-ink">
                            {site.name ?? site.url}
                            {site.type ? <span className="text-muted"> · {site.type}</span> : null}
                            {site.consultedAt ? <span className="text-muted"> · {site.consultedAt}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.admin.noPanelBody}</p>
                  )}
                </div>

                {/* Wat over de hele bank geldt, één keer. Stond dit bij elke
                    vraag, dan was het 129 keer hetzelfde en hielp het nergens
                    kiezen. */}
                {bank.summary ? (
                  <div className="mt-3 rounded-lg bg-surface-2 p-3">
                    <p className="text-sm font-medium">{s.admin.summary}</p>
                    <ul className="mt-1.5 flex flex-col gap-1 text-sm text-muted">
                      <li>
                        {bank.summary.withCoverage === 0 ? s.admin.summaryCoverageNone : (
                          <>
                            <span className="font-medium text-ink">
                              {bank.summary.withCoverage} {s.segments.of} {bank.summary.questions}
                            </span>{' '}
                            {s.admin.summaryCoverage}
                            {bank.summary.panelSize > 0
                              ? ` · ${bank.summary.panelSize} ${s.admin.summaryPanel}`
                              : ''}
                          </>
                        )}
                      </li>
                      <li>
                        <span className="font-medium text-ink">
                          {bank.summary.attributes}
                        </span>{' '}
                        {s.admin.summaryAttributes}{' '}
                        <span className="font-medium text-ink">{bank.summary.attributesMapped}</span>.{' '}
                        {s.admin.summaryAttributesNote}
                      </li>
                    </ul>
                  </div>
                ) : null}

                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {s.admin.issuesLegend}{' '}
                  {(bank.excluded ?? []).length > 0
                    ? `${(bank.excluded ?? []).length} ${s.admin.skippedCount}. ${s.admin.skippedNote}`
                    : ''}
                </p>

                {/* De volledige bank, vraag voor vraag, met het ergste bovenaan.
                    Een lijst tellingen — "26 beslisregels zonder bron" — is niet
                    te beoordelen: je weet niet wélke vragen het betreft. En de
                    goede vragen staan er ook bij, want vrijgeven gaat over de
                    bank als geheel en niet over de probleemgevallen alleen. */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant={onlyIssues ? 'secondary' : 'quiet'}
                    onClick={() => setOnlyIssues(!onlyIssues)}
                  >
                    {onlyIssues ? s.admin.onlyIssues : s.admin.showAll}
                    <span className="text-muted">
                      {onlyIssues
                        ? bank.questions.filter((q) => q.issues.length > 0).length
                        : bank.questions.length}
                    </span>
                  </Button>
                </div>

                <TableWrap>
                  <thead>
                    <tr>
                      <Th>{s.admin.questions}</Th>
                      <Th>{s.questions.importance.critical}</Th>
                      <Th>{s.admin.findings}</Th>
                      <Th>{s.admin.skip}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bank.questions
                      .filter((q) => !onlyIssues || q.issues.length > 0)
                      .map((q) => (
                        <tr
                          key={q.id}
                          className={`border-t border-line align-top ${
                            (bank.excluded ?? []).includes(q.id) ? 'opacity-50' : ''
                          }`}
                        >
                          <Td>
                            <span className="block">{q.label[locale]}</span>
                            <span className="mt-0.5 block font-mono text-xs text-muted">
                              {q.id}
                              {q.category ? ` · ${q.category}` : ''}
                              {q.attributes.length > 0
                                ? ` · ${q.attributes.map((a) => a.key).join(', ')}`
                                : ''}
                              {q.coverage !== null
                                ? ` · ${s.admin.coverageOn} ${q.coverage} ${s.admin.coverageSites}`
                                : ` · ${s.admin.coverageNone}`}
                            </span>
                          </Td>
                          <Td>
                            <Badge tone={q.importance === 'critical' ? 'danger' : 'neutral'}>
                              {s.questions.importance[q.importance] ?? q.importance}
                            </Badge>
                          </Td>
                          <Td>
                            {q.issues.length === 0 ? (
                              <span className="text-xs text-muted">{s.admin.allFine}</span>
                            ) : (
                              <span className="flex flex-col gap-1.5">
                                <span className="flex flex-wrap gap-1.5">
                                  {q.issues.map((issue) => {
                                    const key = `${q.id}:${issue}`;
                                    const open = openIssue === key;
                                    // Een procesvraag is een aantekening; een structuurvraag is werk.
                                    const soft = issue === 'process-question';
                                    return (
                                      <button
                                        key={issue}
                                        type="button"
                                        aria-expanded={open}
                                        onClick={() => setOpenIssue(open ? undefined : key)}
                                        className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                                          soft
                                            ? 'border-line bg-surface-2 text-muted hover:text-ink'
                                            : 'border-transparent bg-warn-soft text-warn hover:opacity-80'
                                        } ${open ? 'ring-2 ring-accent/40' : ''}`}
                                      >
                                        {s.admin.issues[issue] ?? issue}
                                      </button>
                                    );
                                  })}
                                </span>
                                {q.issues
                                  .filter((issue) => openIssue === `${q.id}:${issue}`)
                                  .map((issue) => (
                                    <span key={issue} className="block max-w-prose rounded-lg bg-surface-2 p-2.5 text-xs leading-relaxed text-ink">
                                      {s.admin.issueHelp[issue] ?? ''}
                                    </span>
                                  ))}
                              </span>
                            )}
                          </Td>
                          <Td>
                            {/* Overslaan haalt de vraag niet weg maar zet hem
                                buiten de meting. Zichtbaar en terug te draaien:
                                een keuze die je niet kunt terugzien is geen
                                keuze maar een gok. */}
                            <Button
                              variant={(bank.excluded ?? []).includes(q.id) ? 'secondary' : 'quiet'}
                              loading={busy === `${bank.id}:${q.id}`}
                              onClick={() => void toggle(bank.id, q.id)}
                            >
                              {(bank.excluded ?? []).includes(q.id) ? s.admin.include : s.admin.skip}
                            </Button>
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>

                <div className="mt-3">
                  <Button onClick={() => void release(bank.id)} loading={busy === bank.id}>
                    {busy === bank.id ? s.admin.releasing : s.admin.release}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
