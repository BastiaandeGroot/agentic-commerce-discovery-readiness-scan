'use client';

// Voorbeeldrapport. In deze stap alleen de vorm; stap 6 en 7 zetten hier het
// echte rapport op de voorbeeldfeed neer, meteen zichtbaar en zonder upload.

import Link from 'next/link';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Badge, Card, CardTitle, SkeletonLines } from '../../../components/ui';

export default function DemoPage() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{s.pages.demo.title}</h1>
          {/* Duidelijk gemarkeerd: dit zijn niet de cijfers van de bezoeker. */}
          <Badge tone="warn">{s.pages.demo.badge}</Badge>
        </div>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{s.pages.demo.intro}</p>
      </header>

      <Card>
        <CardTitle sub={s.pages.demo.todo}>{s.report.funnelHeading}</CardTitle>
        <SkeletonLines lines={4} />
      </Card>

      <Link href="/scan" className="inline-block text-sm text-accent underline underline-offset-2">
        {s.shell.nav.scan}
      </Link>
    </div>
  );
}
