'use client';

// Alle vragenbanken op een rij.
//
// Het beoordeelscherm toont alleen wat op review staat — dat is werk dat wacht.
// Dit is de andere vraag: wat hebben we, per markt, en waar rust het op. Een
// bank is de asset waar dit product op draait, en die hoort ergens te staan waar
// je hem in één blik ziet.
//
// Dicht in plaats van ruim: dit is een naslagscherm, geen instap. Wie hier komt
// weet wat hij zoekt.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, CardTitle, EmptyState, ErrorState, SkeletonLines, TableWrap, Td, Th } from '../../../../components/ui';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { authHeader } from '../../../../src/auth/client';
import { useAuth } from '../../../../components/auth/AuthProvider';

interface GroupingEntry { category: string; count: number; kind: string; parent?: string; reason?: string }

interface PanelSite { name?: string; url?: string; type?: string; consultedAt?: string }

interface BankSummary {
  questions: number; withCoverage: number; panelSize: number;
  attributes: number; attributesMapped: number;
}

interface BankRow {
  id: string;
  vertical: string;
  version: number;
  status: string;
  findings: string[];
  panel: PanelSite[];
  grouping?: GroupingEntry[];
  summary?: BankSummary;
  created_at: string;
  released_at?: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'failed' }
  | { kind: 'ready'; banks: BankRow[] };

const TONE: Record<string, 'ok' | 'warn' | 'neutral'> = {
  ready: 'ok', frozen: 'ok', review: 'warn', withdrawn: 'neutral',
};

export default function Page() {
  const [locale] = useLocale();
  const { user } = useAuth();
  const s = STRINGS[locale].bankList;
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [open, setOpen] = useState<string>();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/queue', { headers: await authHeader() });
      if (response.status === 403) { setState({ kind: 'denied' }); return; }
      if (!response.ok) { setState({ kind: 'failed' }); return; }
      const data = await response.json();
      setState({ kind: 'ready', banks: (data.banks ?? []) as BankRow[] });
    } catch {
      setState({ kind: 'failed' });
    }
  }, []);

  useEffect(() => {
    // Pas ophalen als we weten wie er is. Vroeger gaat het verzoek zonder token
    // de deur uit, komt er 403 terug, en blijft het scherm op "alleen voor
    // beheerders" staan terwijl je gewoon ingelogd bent. Dat gebeurt alleen bij
    // een harde herlaad op dit scherm — precies het geval dat je zelf niet
    // tegenkomt en een ander wel.
    if (user === undefined) return;
    void (async () => { await Promise.resolve(); await load(); })();
  }, [load, user]);

  const date = (raw?: string) =>
    raw ? new Date(raw).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }) : s.notReleased;

  if (state.kind === 'loading') return <Card><SkeletonLines lines={5} /></Card>;
  if (state.kind === 'denied') {
    return <Card><ErrorState title={STRINGS[locale].admin.denied} body={STRINGS[locale].admin.deniedBody} /></Card>;
  }
  if (state.kind === 'failed') {
    return <Card><ErrorState title={STRINGS[locale].admin.failed} body={STRINGS[locale].admin.failedBody} /></Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.heading}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{s.intro}</p>
      </div>

      <Card>
        {state.banks.length === 0 ? (
          <EmptyState title={s.empty} body={s.emptyBody} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{s.market}</Th>
                <Th>{s.version}</Th>
                <Th>{s.status}</Th>
                <Th>{s.questions}</Th>
                <Th>{s.panel}</Th>
                <Th>{s.findings}</Th>
                <Th>{s.created}</Th>
                <Th>{s.released}</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {state.banks.map((bank) => (
                <tr key={bank.id}>
                  <Td>{bank.vertical}</Td>
                  <Td>v{bank.version}</Td>
                  <Td>
                    <Badge tone={TONE[bank.status] ?? 'neutral'}>
                      {STRINGS[locale].admin.statuses[bank.status] ?? bank.status}
                    </Badge>
                  </Td>
                  <Td>{bank.summary?.questions ?? '—'}</Td>
                  <Td>{bank.panel.length > 0 ? `${bank.panel.length} ${s.sites}` : '—'}</Td>
                  <Td>{bank.findings.length > 0 ? bank.findings.length : '—'}</Td>
                  <Td>{date(bank.created_at)}</Td>
                  <Td>{date(bank.released_at)}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setOpen(open === bank.id ? undefined : bank.id)}
                      className="text-sm font-medium text-accent underline underline-offset-4"
                    >
                      {open === bank.id ? s.close : s.open}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {/* Eén bank uitgeklapt, onder de tabel. Naast de rij zou de tabel uit
          elkaar springen; hieronder blijft de vergelijking tussen banken staan
          terwijl je er één bekijkt. */}
      {state.banks.filter((bank) => bank.id === open).map((bank) => (
        <Detail key={bank.id} bank={bank} s={s} locale={locale} />
      ))}
    </div>
  );
}

function Detail({ bank, s, locale }: {
  bank: BankRow;
  s: typeof STRINGS['nl']['bankList'];
  locale: 'nl' | 'en';
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle sub={`${bank.vertical} v${bank.version}`}>{STRINGS[locale].admin.summary}</CardTitle>
        {bank.summary ? (
          <ul className="flex flex-col gap-1 text-sm text-muted">
            <li>
              <span className="font-medium text-ink">{bank.summary.withCoverage} / {bank.summary.questions}</span>{' '}
              {s.coverage}
            </li>
            <li>
              <span className="font-medium text-ink">{bank.summary.attributes}</span> {s.attributes}
            </li>
          </ul>
        ) : null}
        {bank.status === 'review' ? (
          <p className="mt-3">
            <Link href="/dashboard/aanvragen" className="text-sm font-medium text-accent underline underline-offset-4">
              {s.toReview}
            </Link>
          </p>
        ) : null}
      </Card>

      <Card>
        <CardTitle>{STRINGS[locale].admin.panel}</CardTitle>
        {bank.panel.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {bank.panel.map((site) => (
              <li key={site.url ?? site.name} className="text-sm">
                {site.name ?? site.url}
                {site.type ? <span className="text-muted"> · {site.type}</span> : null}
                {site.consultedAt ? <span className="text-muted"> · {site.consultedAt}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted">{s.noPanel}</p>
        )}
      </Card>

      <Card>
        <CardTitle>{s.grouping}</CardTitle>
        {bank.grouping && bank.grouping.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {bank.grouping.map((entry) => (
              <li key={entry.category} className="text-sm">
                {entry.category}
                <span className="text-muted"> · {entry.count}</span>
                <span className="text-muted">
                  {' · '}
                  {STRINGS[locale].admin.groupingKinds[entry.kind] ?? entry.kind}
                  {entry.parent ? ` (${entry.parent})` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted">{s.noGrouping}</p>
        )}
      </Card>

      {bank.findings.length > 0 ? (
        <Card>
          <CardTitle>{s.findings}</CardTitle>
          <ul className="flex flex-col gap-1.5">
            {bank.findings.map((finding) => (
              <li key={finding} className="text-sm leading-relaxed text-muted">{finding}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
