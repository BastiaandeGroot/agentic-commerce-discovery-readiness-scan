'use client';

import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { Card, CardTitle } from '../../../../components/ui';

export default function SettingsPage() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.settingsTitle}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.settingsIntro}</p>
      </header>

      <Card>
        <CardTitle sub={s.pages.dashboard.soonBody}>{s.pages.dashboard.soon}</CardTitle>
      </Card>
    </div>
  );
}
