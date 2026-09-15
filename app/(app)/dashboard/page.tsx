'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScanSnapshot } from '../../../src/engine/snapshot';
import { snapshotStoreFor } from '../../../src/storage/snapshots';
import { supabase } from '../../../src/auth/client';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { useAuth } from '../../../components/auth/AuthProvider';
import { Card, CardTitle, EmptyState, ErrorState, SkeletonLines } from '../../../components/ui';
import { SnapshotRow, n } from '../../../components/ScanList';

export default function DashboardPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const { user, accountId } = useAuth();
  // Ingelogd uit het account, anders uit deze browser.
  const target = useMemo(() => snapshotStoreFor(supabase(), accountId), [accountId]);
  const [snapshots, setSnapshots] = useState<ScanSnapshot[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Pas als bekend is of er iemand is, anders springt de lijst van browser naar account.
    if (user === undefined) return;
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const list = await target.store.list(target.accountId);
        if (alive) { setFailed(false); setSnapshots(list); }
      } catch {
        if (alive) { setFailed(true); setSnapshots([]); }
      }
    })();
    return () => { alive = false; };
  }, [user, target]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.intro}</p>
      </header>

      {/* Eerlijk over waar dit staat, want dat bepaalt wat de merchant ermee kan. */}
      <Card>
        {target.where === 'account' ? (
          <CardTitle sub={s.pages.dashboard.accountBody}>{s.pages.dashboard.accountTitle}</CardTitle>
        ) : (
          <CardTitle sub={s.pages.dashboard.localBody}>{s.pages.dashboard.localTitle}</CardTitle>
        )}
      </Card>

      <Card>
        {snapshots === undefined ? (
          <SkeletonLines lines={3} />
        ) : failed ? (
          <ErrorState
            title={s.pages.dashboard.loadFailed}
            body={s.pages.dashboard.loadFailedBody}
            next={s.pages.dashboard.loadFailedNext}
            action={{ label: s.pages.dashboard.retry, onClick: () => router.refresh() }}
          />
        ) : snapshots.length === 0 ? (
          <EmptyState
            title={s.pages.dashboard.emptyTitle}
            body={s.pages.dashboard.emptyBody}
            action={{ label: s.shell.nav.scan, onClick: () => router.push('/scan') }}
          />
        ) : (
          <>
            <CardTitle>{n(snapshots.length)} {s.pages.dashboard.saved}</CardTitle>
            <ul>
              {snapshots.slice(0, 5).map((snapshot) => (
                <SnapshotRow
                  key={snapshot.id}
                  s={s}
                  locale={locale}
                  snapshot={snapshot}
                  onOpen={() => router.push(`/dashboard/scans#${encodeURIComponent(snapshot.id)}`)}
                />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
