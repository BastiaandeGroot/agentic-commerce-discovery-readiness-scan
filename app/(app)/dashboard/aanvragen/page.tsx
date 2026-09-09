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
import { Clock, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorState, SkeletonLines } from '../../../../components/ui';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { authHeader } from '../../../../src/auth/client';

interface RequestRow {
  id: string; vertical: string; status: string;
  site_url?: string; suggested_sites?: string[]; segments?: { name: string; count: number }[];
  requested_at: string; failure?: string; bank_id?: string;
  waitingHours: number; overdue: boolean;
}

interface BankRow {
  id: string; vertical: string; version: number; status: string;
  findings: string[]; panel: { name?: string; url?: string; type?: string; consultedAt?: string }[];
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
                  <span className="text-xs text-muted">
                    {s.admin.panel}: {bank.panel.length > 0
                      ? bank.panel.map((site) => site.name ?? site.url).join(', ')
                      : s.admin.noPanel}
                  </span>
                </div>

                {/* De bevindingen staan open en niet ingeklapt: ze zijn de reden
                    dat deze bank niet vanzelf is vrijgegeven, en wegklikken wat
                    je moet lezen maakt vrijgeven een routineklik. */}
                {bank.findings.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {bank.findings.map((finding) => (
                      <li key={finding} className="flex items-start gap-2 text-sm leading-relaxed text-muted">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

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
