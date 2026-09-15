'use client';

// Alle bewaarde analyses, en er één terugzien.
//
// Ingelogd komen ze uit het account, zodat een merchant ze op elk apparaat
// terugziet zonder alle stappen opnieuw te doorlopen. Anders uit deze browser.
// Een analyse openen gebeurt op deze pagina en niet op een eigen adres: het
// overzicht linkt hierheen met de id achter een #, en dat is genoeg.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScanSnapshot } from '../../../../src/engine/snapshot';
import { compareSnapshots } from '../../../../src/engine/compare';
import { snapshotStoreFor } from '../../../../src/storage/snapshots';
import { supabase } from '../../../../src/auth/client';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { useAuth } from '../../../../components/auth/AuthProvider';
import { Button, Card, CardTitle, EmptyState, ErrorState, Select, SkeletonLines } from '../../../../components/ui';
import { ComparisonView, SnapshotRow } from '../../../../components/ScanList';
import { SnapshotReport } from '../../../../components/SnapshotReport';

export default function ScansPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const { user, accountId } = useAuth();
  const target = useMemo(() => snapshotStoreFor(supabase(), accountId), [accountId]);

  const [snapshots, setSnapshots] = useState<ScanSnapshot[]>();
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string>();
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      const list = await target.store.list(target.accountId);
      setSnapshots(list);
      // Standaard de twee nieuwste: dat is bijna altijd wat je wilt zien.
      if (list.length >= 2) { setAfterId(list[0].id); setBeforeId(list[1].id); }
    } catch {
      setFailed(true);
      setSnapshots([]);
    }
  }, [target]);

  // Wachten tot bekend is of er iemand is ingelogd: anders toont de pagina eerst
  // de scans uit de browser en springt hij daarna naar die uit het account.
  useEffect(() => {
    if (user === undefined) return;
    void (async () => { await Promise.resolve(); await refresh(); })();
  }, [user, refresh]);

  // Vanuit het overzicht: de id staat achter de #.
  useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    if (fromHash) void (async () => { await Promise.resolve(); setOpenId(fromHash); })();
  }, []);

  function open(id: string | undefined) {
    setOpenId(id);
    window.history.replaceState(null, '', id ? `#${encodeURIComponent(id)}` : window.location.pathname);
    window.scrollTo({ top: 0 });
  }

  const comparison = useMemo(() => {
    const before = snapshots?.find((x) => x.id === beforeId);
    const after = snapshots?.find((x) => x.id === afterId);
    if (!before || !after || before.id === after.id) return undefined;
    return compareSnapshots(before, after);
  }, [snapshots, beforeId, afterId]);

  const options = (snapshots ?? []).map((x) => ({
    value: x.id,
    label: `${x.label} — ${new Date(x.savedAt).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB')}`,
  }));

  const opened = openId ? snapshots?.find((x) => x.id === openId) : undefined;

  // Eén analyse open.
  if (openId && snapshots !== undefined) {
    return (
      <div className="space-y-4">
        <Button variant="quiet" onClick={() => open(undefined)}>← {s.pages.dashboard.back}</Button>
        {opened ? (
          <SnapshotReport s={s} locale={locale} snapshot={opened} onRescan={() => router.push('/scan')} />
        ) : (
          <Card><p className="text-sm text-muted">{s.pages.dashboard.notFound}</p></Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.scansTitle}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.scansIntro}</p>
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
            action={{ label: s.pages.dashboard.retry, onClick: () => void refresh() }}
          />
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
                onOpen={() => open(snapshot.id)}
                onRemove={() => void target.store.remove(target.accountId, snapshot.id).then(refresh, () => setFailed(true))}
              />
            ))}
          </ul>
        )}
      </Card>

      {snapshots && !failed && snapshots.length >= 2 ? (
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
      ) : snapshots && !failed && snapshots.length === 1 ? (
        <Card><p className="text-sm text-muted">{s.pages.dashboard.compareNeedTwo}</p></Card>
      ) : null}
    </div>
  );
}
