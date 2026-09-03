'use client';

import { useEffect, useState } from 'react';
import { LOCAL_ACCOUNT, snapshotStore } from '../../../../src/storage/snapshots';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { Button, Card, CardTitle, useToast } from '../../../../components/ui';

export default function SettingsPage() {
  const [locale] = useLocale();
  const s = STRINGS[locale];
  const toast = useToast();
  const [count, setCount] = useState<number>();

  async function refresh() {
    setCount((await snapshotStore.list(LOCAL_ACCOUNT)).length);
  }
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{s.pages.dashboard.settingsTitle}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.pages.dashboard.settingsIntro}</p>
      </header>

      <Card>
        <CardTitle sub={s.pages.dashboard.localBody}>{s.pages.dashboard.localTitle}</CardTitle>
      </Card>

      {/* Je data weg kunnen gooien hoort bij je data mogen bewaren, ook als die
          alleen in je eigen browser staat. */}
      <Card>
        <CardTitle sub={s.pages.dashboard.clearBody}>{s.pages.dashboard.clearTitle}</CardTitle>
        <Button
          variant="secondary"
          disabled={count === 0}
          onClick={() => void snapshotStore.clear(LOCAL_ACCOUNT).then(() => {
            toast('ok', s.pages.dashboard.cleared);
            void refresh();
          })}
        >
          {s.pages.dashboard.clearAction}
          {count !== undefined && count > 0 ? ` (${count})` : ''}
        </Button>
      </Card>

      <Card>
        <CardTitle sub={s.pages.dashboard.soonBody}>{s.pages.dashboard.soon}</CardTitle>
      </Card>
    </div>
  );
}
