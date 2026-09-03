'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScanSnapshot } from '../../../src/engine/snapshot';
import { LOCAL_ACCOUNT, snapshotStore } from '../../../src/storage/snapshots';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Card, CardTitle, EmptyState, SkeletonLines } from '../../../components/ui';
import { SnapshotRow, n } from '../../../components/ScanList';

export default function DashboardPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const [snapshots, setSnapshots] = useState<ScanSnapshot[]>();

  useEffect(() => { void snapshotStore.list(LOCAL_ACCOUNT).then(setSnapshots); }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.intro}</p>
      </header>

      {/* Eerlijk over waar dit staat, want dat bepaalt wat de merchant ermee kan. */}
      <Card>
        <CardTitle sub={s.pages.dashboard.localBody}>{s.pages.dashboard.localTitle}</CardTitle>
      </Card>

      <Card>
        {snapshots === undefined ? (
          <SkeletonLines lines={3} />
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
                <SnapshotRow key={snapshot.id} s={s} locale={locale} snapshot={snapshot} />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
