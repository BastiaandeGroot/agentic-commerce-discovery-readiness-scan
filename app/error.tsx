'use client';

// Een scherm dat omviel.
//
// Zegt wat er mis is én wat de bezoeker nu doet — dezelfde eis als aan elke
// foutmelding in deze app. En het zegt er nadrukkelijk bij dat zijn scan en
// bewaarde rapporten hier niet door geraakt zijn: de analyse draait in de
// browser en de opslag staat los van dit scherm, dus een kapotte pagina is geen
// kwijtgeraakt werk. Dat is precies wat iemand op dit moment wil weten.

import Link from 'next/link';
import { useEffect } from 'react';
import { STRINGS } from '../src/i18n/strings';
import { useLocale } from '../src/i18n/useLocale';
import { Button, Card } from '../components/ui';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const [locale] = useLocale();
  const s = STRINGS[locale].pages.error;

  useEffect(() => {
    // Serverzijdig in de logs, niet op het scherm: een stacktrace helpt de
    // bezoeker niet en verklapt hoe de app in elkaar zit.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
      <Card>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={reset}>{s.action}</Button>
          <Link href="/" className="text-sm font-medium text-accent underline underline-offset-4">
            {s.home}
          </Link>
        </div>
      </Card>
    </main>
  );
}
