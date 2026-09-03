'use client';

// Rapport op een eigen adres, zodat het gedeeld kan worden.
//
// Rapporten worden nog nergens bewaard — dat komt met de accounts in stap 8.
// Tot die tijd is elk id onbekend, en dat zeggen we hardop in plaats van een
// leeg scherm te tonen.

import { useParams, useRouter } from 'next/navigation';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { Card, CardTitle, EmptyState } from '../../../../components/ui';

export default function ReportPage() {
  const [locale] = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const s = STRINGS[locale];

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{s.pages.report.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">{s.pages.report.intro}</p>
      </header>

      <Card>
        <CardTitle>
          <span className="font-mono text-sm text-muted">{params?.id}</span>
        </CardTitle>
        <EmptyState
          title={s.pages.report.notFound}
          body={s.pages.report.notFoundBody}
          action={{ label: s.pages.report.runScan, onClick: () => router.push('/scan') }}
        />
      </Card>
    </div>
  );
}
