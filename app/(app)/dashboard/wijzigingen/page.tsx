'use client';

// Het wijzigingslog: wat de merchant aan zijn vragensets veranderde.
//
// Uit het bewaarde werk per account en per markt (`merchant_bank_settings`), en
// dus niet uit een open scan: het log hoort terug te lezen te zijn zonder dat
// er een catalogus in de browser staat. Nieuwste eerst, want dat is wat je zoekt
// als een cijfer tussen twee scans verschoof.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocalSettingsStore, SupabaseSettingsStore, type BankSettings, type SettingsStore } from '../../../../src/storage/settings';
import { LOCAL_ACCOUNT } from '../../../../src/storage/banks';
import { supabase } from '../../../../src/auth/client';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { useAuth } from '../../../../components/auth/AuthProvider';
import { Card, CardTitle, EmptyState, ErrorState, SkeletonLines, TableWrap, Td, Th } from '../../../../components/ui';

export default function ChangesPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const { user, accountId } = useAuth();
  const store = useMemo<SettingsStore>(() => {
    const client = supabase();
    return client && accountId ? new SupabaseSettingsStore(client) : new LocalSettingsStore();
  }, [accountId]);

  const [settings, setSettings] = useState<BankSettings[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Pas als bekend is of er iemand is, anders springt de lijst van browser naar account.
    if (user === undefined) return;
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const list = await store.list(accountId ?? LOCAL_ACCOUNT);
        if (alive) { setFailed(false); setSettings(list); }
      } catch {
        if (alive) { setFailed(true); setSettings([]); }
      }
    })();
    return () => { alive = false; };
  }, [user, accountId, store, attempt]);

  const withChanges = (settings ?? [])
    .filter((entry) => (entry.work?.changeLog.length ?? 0) > 0)
    .sort((a, b) => a.vertical.localeCompare(b.vertical));

  const when = (iso: string) => new Date(iso).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.changesTitle}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{s.pages.dashboard.changesIntro}</p>
      </header>

      {settings === undefined ? (
        <Card><SkeletonLines lines={4} /></Card>
      ) : failed ? (
        <Card>
          <ErrorState
            title={s.pages.dashboard.loadFailed}
            body={s.pages.dashboard.loadFailedBody}
            next={s.pages.dashboard.loadFailedNext}
            action={{ label: s.pages.dashboard.retry, onClick: () => setAttempt((value) => value + 1) }}
          />
        </Card>
      ) : withChanges.length === 0 ? (
        <Card>
          <EmptyState
            title={s.pages.dashboard.changesEmptyTitle}
            body={s.pages.dashboard.changesEmptyBody}
            action={{ label: s.shell.nav.scan, onClick: () => router.push('/scan') }}
          />
        </Card>
      ) : (
        withChanges.map((entry) => {
          const log = [...(entry.work?.changeLog ?? [])].sort((a, b) => b.at.localeCompare(a.at));
          return (
            <Card key={entry.vertical}>
              <CardTitle
                sub={`${log.length} ${s.pages.dashboard.changesCount} · ${s.pages.dashboard.changesVersion} v${entry.work?.stateVersion ?? 1}`}
              >
                {entry.vertical}{entry.bankVersion ? ` v${entry.bankVersion}` : ''}
              </CardTitle>
              <TableWrap minWidth="36rem">
                <thead>
                  <tr className="border-b border-line">
                    <Th>{s.pages.dashboard.changesWhen}</Th>
                    <Th>{s.pages.dashboard.changesCategory}</Th>
                    <Th>{s.pages.dashboard.changesQuestion}</Th>
                    <Th>{s.pages.dashboard.changesWhat}</Th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((change, index) => (
                    <tr key={`${change.at}-${change.setId}-${change.questionId}-${index}`} className="border-b border-line last:border-b-0">
                      <Td><span className="tnum text-xs text-muted">{when(change.at)}</span></Td>
                      <Td><span className="text-xs">{change.setId}</span></Td>
                      <Td><span className="font-mono text-xs">{change.questionId}</span></Td>
                      <Td>
                        <span className="text-sm">{s.questions.changeActions[change.action]}</span>
                        {change.before && change.after ? (
                          <span className="mt-0.5 block text-xs text-muted">“{change.before}” → “{change.after}”</span>
                        ) : change.after ? (
                          <span className="mt-0.5 block text-xs text-muted">“{change.after}”</span>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          );
        })
      )}
    </div>
  );
}
