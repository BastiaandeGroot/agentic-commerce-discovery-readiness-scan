'use client';

import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Badge, Card, CardTitle } from '../../../components/ui';

export default function PricingPage() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.pages.pricing.title}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{s.pages.pricing.intro}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{s.pages.pricing.freeTitle}</CardTitle>
          <p className="text-sm leading-relaxed text-muted">{s.pages.pricing.freeBody}</p>
        </Card>
        <Card>
          <CardTitle>{s.pages.pricing.paidTitle}</CardTitle>
          <p className="text-sm leading-relaxed text-muted">{s.pages.pricing.paidBody}</p>
        </Card>
      </div>

      {/* Geen verzonnen bedragen; wat we niet weten laten we open staan. */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warn">TODO</Badge>
          <p className="text-sm text-muted">{s.pages.pricing.todo}</p>
        </div>
      </Card>
    </div>
  );
}
