'use client';

// De vragensets van een bewaarde analyse bijstellen, zonder catalogus.
//
// Een merchant die zijn resultaten terugkijkt en een vraag ziet die niet klopt,
// hoort die te kunnen uitzetten zonder zijn export opnieuw te zoeken en alle
// stappen door te lopen. De scan bewaarde de samenstelling en per product de
// toestand van elke vraag; daarmee telt het rapport meteen opnieuw op. Het werk
// gaat naar dezelfde plek als tijdens de scan, dus de volgende scan neemt het mee.
//
// Wat hier niet kan: een vraag toevoegen. Die is nog nergens gemeten, en meten
// vraagt de catalogus.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionSetState } from '../../../../../src/domain/types';
import type { ScanSnapshot, SnapshotDetail } from '../../../../../src/engine/snapshot';
import { applyWork, mergeWork } from '../../../../../src/questions/work';
import { verticalOf } from '../../../../../src/report/saved';
import { LOCAL_ACCOUNT, snapshotStoreFor } from '../../../../../src/storage/snapshots';
import { LocalSettingsStore, SupabaseSettingsStore, type BankSettings, type SettingsStore } from '../../../../../src/storage/settings';
import { supabase } from '../../../../../src/auth/client';
import { STRINGS } from '../../../../../src/i18n/strings';
import { useLocale } from '../../../../../src/i18n/useLocale';
import { useAuth } from '../../../../../components/auth/AuthProvider';
import { QuestionSetStep } from '../../../../../components/QuestionSetStep';
import { Button, Card, ErrorState, SkeletonLines } from '../../../../../components/ui';

type Loaded =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'not-found' }
  | { kind: 'no-detail'; snapshot: ScanSnapshot }
  | { kind: 'ready'; snapshot: ScanSnapshot; detail: SnapshotDetail; settings?: BankSettings };

export default function SavedQuestionsPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const { user, accountId } = useAuth();
  const target = useMemo(() => snapshotStoreFor(supabase(), accountId), [accountId]);
  const settingsStore = useMemo<SettingsStore>(() => {
    const client = supabase();
    return client && accountId ? new SupabaseSettingsStore(client) : new LocalSettingsStore();
  }, [accountId]);

  const [params, setParams] = useState<{ id: string; focus?: { setId: string; questionId: string; base: boolean } }>();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
  const [state, setState] = useState<QuestionSetState>();
  const [saved, setSaved] = useState<'account' | 'browser' | 'failed'>();
  const [attempt, setAttempt] = useState(0);

  // Welke analyse en welke vraag: uit het adres, één keer.
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const id = search.get('analyse') ?? '';
    const questionId = search.get('vraag');
    const setId = search.get('set');
    void (async () => {
      await Promise.resolve();
      setParams({
        id,
        focus: questionId && setId ? { questionId, setId, base: search.get('algemeen') === '1' } : undefined,
      });
    })();
  }, []);

  useEffect(() => {
    // Pas als bekend is of er iemand is, anders zoekt hij in de verkeerde opslag.
    if (user === undefined || !params) return;
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const snapshot = (await target.store.list(target.accountId)).find((one) => one.id === params.id);
        if (!snapshot) { if (alive) setLoaded({ kind: 'not-found' }); return; }
        const detail = await target.store.loadDetail(target.accountId, snapshot.id);
        const market = detail ? verticalOf(detail) : undefined;
        if (!detail || !market) { if (alive) setLoaded({ kind: 'no-detail', snapshot }); return; }
        const settings = await settingsStore.load(accountId ?? LOCAL_ACCOUNT, market.vertical);
        if (!alive) return;
        setState(applyWork(detail.pristine, settings?.work).state);
        setLoaded({ kind: 'ready', snapshot, detail, settings });
      } catch {
        if (alive) setLoaded({ kind: 'failed' });
      }
    })();
    return () => { alive = false; };
  }, [user, params, target, settingsStore, accountId, attempt]);

  const back = () => router.push(`/dashboard/scans#${encodeURIComponent(params?.id ?? '')}`);

  /** Meteen bewaren, zoals tijdens de scan: wie wegklikt, houdt zijn werk. */
  function change(next: QuestionSetState) {
    if (loaded.kind !== 'ready') return;
    setState(next);
    const market = verticalOf(loaded.detail);
    if (!market) return;
    const work = mergeWork(loaded.settings?.work, next, loaded.detail.pristine);
    const settings: BankSettings = {
      vertical: market.vertical,
      bankVersion: loaded.settings?.bankVersion || market.version,
      mapping: loaded.settings?.mapping ?? {},
      categories: loaded.settings?.categories ?? {},
      work,
    };
    setLoaded({ ...loaded, settings });
    void settingsStore.save(accountId ?? LOCAL_ACCOUNT, settings)
      .then((ok) => setSaved(ok ? settingsStore.where : 'failed'), () => setSaved('failed'));
  }

  return (
    <div className="space-y-4">
      <Button variant="quiet" onClick={back}>← {s.pages.dashboard.backToAnalysis}</Button>
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.questionsTitle}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.questionsIntro}</p>
      </header>

      {loaded.kind === 'loading' ? (
        <Card><SkeletonLines lines={5} /></Card>
      ) : loaded.kind === 'failed' ? (
        <Card>
          <ErrorState
            title={s.pages.dashboard.detailLoadFailed}
            body={s.pages.dashboard.loadFailedBody}
            next={s.pages.dashboard.loadFailedNext}
            action={{ label: s.pages.dashboard.retry, onClick: () => { setLoaded({ kind: 'loading' }); setAttempt((n) => n + 1); } }}
          />
        </Card>
      ) : loaded.kind === 'not-found' ? (
        <Card><p className="text-sm text-muted">{s.pages.dashboard.notFound}</p></Card>
      ) : loaded.kind === 'no-detail' ? (
        <Card>
          <ErrorState
            title={s.pages.dashboard.questionsNoDetail}
            body={s.pages.dashboard.questionsNoDetailBody}
            next={s.pages.dashboard.questionsNoDetailNext}
            action={{ label: s.pages.dashboard.rescan, onClick: () => router.push('/scan') }}
          />
        </Card>
      ) : state ? (
        <QuestionSetStep
          s={s}
          locale={locale}
          state={state}
          onChange={change}
          onContinue={back}
          continueLabel={s.pages.dashboard.backToAnalysis}
          requireValidated={false}
          saved={saved ?? settingsStore.where}
          focus={params?.focus}
        />
      ) : null}
    </div>
  );
}
