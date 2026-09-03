'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScanSnapshot } from '../../../../src/engine/snapshot';
import { compareSnapshots } from '../../../../src/engine/compare';
import { LOCAL_ACCOUNT, snapshotStore } from '../../../../src/storage/snapshots';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { Card, CardTitle, EmptyState, Select, SkeletonLines } from '../../../../components/ui';
import { ComparisonView, SnapshotRow } from '../../../../components/ScanList';

export default function ScansPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const [snapshots, setSnapshots] = useState<ScanSnapshot[]>();
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');

  async function refresh() {
    const list = await snapshotStore.list(LOCAL_ACCOUNT);
    setSnapshots(list);
    // Standaard de twee nieuwste: dat is bijna altijd wat je wilt zien.
    if (list.length >= 2) { setAfterId(list[0].id); setBeforeId(list[1].id); }
  }
  useEffect(() => { void refresh(); }, []);

  const comparison = useMemo(() => {
    const before = snapshots?.find((x) => x.id === beforeId);
    const after = snapshots?.find((x) => x.id === afterId);
    if (!before || !after || before.id === after.id) return undefined;
    return compareSnapshots(before, after);
  }, [snapshots, beforeId, afterId]);

  const options = (snapshots ?? []).map((x) => ({
    value: x.id,
    label: `${x.label} — ${new Date(x.savedAt).toLocaleDateString('nl-NL')}`,
  }));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.scansTitle}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.scansIntro}</p>
      </header>

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
          <ul>
            {snapshots.map((snapshot) => (
              <SnapshotRow
                key={snapshot.id}
                s={s}
                locale={locale}
                snapshot={snapshot}
                onRemove={() => void snapshotStore.remove(LOCAL_ACCOUNT, snapshot.id).then(refresh)}
              />
            ))}
          </ul>
        )}
      </Card>

      {snapshots && snapshots.length >= 2 ? (
        <>
          <Card>
            <CardTitle sub={s.pages.dashboard.compareIntro}>{s.pages.dashboard.compareHeading}</CardTitle>
            <div className="flex flex-wrap gap-4">
              <Select label={s.pages.dashboard.compareBefore} value={beforeId} onChange={setBeforeId} options={options} />
              <Select label={s.pages.dashboard.compareAfter} value={afterId} onChange={setAfterId} options={options} />
            </div>
          </Card>
          {comparison ? <ComparisonView s={s} locale={locale} comparison={comparison} /> : null}
        </>
      ) : snapshots && snapshots.length === 1 ? (
        <Card><p className="text-sm text-muted">{s.pages.dashboard.compareNeedTwo}</p></Card>
      ) : null}
    </div>
  );
}
