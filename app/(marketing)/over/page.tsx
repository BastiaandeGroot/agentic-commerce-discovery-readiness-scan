'use client';

import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Card, CardTitle } from '../../../components/ui';

export default function AboutPage() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.pages.about.title}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{s.pages.about.intro}</p>
      </header>

      <Card>
        <CardTitle>{s.pages.about.title}</CardTitle>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>{s.pages.about.deterministic}</p>
          <p>{s.pages.about.privacy}</p>
          <p className="text-muted">{s.pages.about.promise}</p>
        </div>
      </Card>
    </div>
  );
}
