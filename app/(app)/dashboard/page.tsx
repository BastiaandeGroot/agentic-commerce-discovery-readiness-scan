'use client';

import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Card, CardTitle, EmptyState } from '../../../components/ui';

export default function DashboardPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.intro}</p>
      </header>

      <Card>
        <CardTitle sub={s.pages.dashboard.soonBody}>{s.pages.dashboard.soon}</CardTitle>
        <EmptyState
          title={s.pages.dashboard.emptyTitle}
          body={s.pages.dashboard.emptyBody}
          action={{ label: s.shell.nav.scan, onClick: () => router.push('/scan') }}
        />
      </Card>
    </div>
  );
}
