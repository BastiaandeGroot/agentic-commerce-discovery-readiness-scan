'use client';

// Het volledige rapport op voorbeelddata, meteen zichtbaar. Geen upload, geen
// account, geen formulier — wie wil zien wat hij krijgt, moet dat kunnen zien
// zonder eerst zijn eigen catalogus af te staan.

import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Badge, Card, CardTitle, ErrorState, SkeletonLines } from '../../../components/ui';
import { ReportView } from '../../../components/ReportView';
import { useSampleScan } from '../../../components/useSampleScan';

export function DemoContent() {
  const [locale] = useLocale();
  const router = useRouter();
  const s = STRINGS[locale];
  const { report, error } = useSampleScan();

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{s.pages.demo.title}</h1>
          {/* Duidelijk gemarkeerd: dit zijn niet de cijfers van de bezoeker. */}
          <Badge tone="warn">{s.pages.demo.badge}</Badge>
        </div>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{s.pages.demo.intro}</p>
      </header>

      {error ? (
        <ErrorState title={s.errors.scanFailed} body={error} next={s.errors.scanFailedNext} />
      ) : !report ? (
        <Card>
          <CardTitle>{s.report.funnelHeading}</CardTitle>
          <SkeletonLines lines={5} />
        </Card>
      ) : (
        <ReportView
          s={s}
          locale={locale}
          report={report}
          onRestart={() => router.push('/scan')}
          restartLabel={s.pages.demo.ownFile}
        />
      )}
    </div>
  );
}
