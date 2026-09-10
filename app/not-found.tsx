'use client';

// Het adres bestaat niet.
//
// Een eigen pagina en niet die van Next, om twee redenen. De standaardpagina is
// Engels in een verder volledig tweetalige app, en ze zegt alleen dát er niets
// is — niet wat de bezoeker nu kan doen. Dat laatste is de regel uit DESIGN.md
// voor élke lege of foute toestand.

import Link from 'next/link';
import { STRINGS } from '../src/i18n/strings';
import { useLocale } from '../src/i18n/useLocale';
import { Card } from '../components/ui';

export default function NotFound() {
  const [locale] = useLocale();
  const s = STRINGS[locale].pages.notFound;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
      <Card>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
        <p className="mt-5">
          <Link href="/" className="text-sm font-medium text-accent underline underline-offset-4">
            {s.action}
          </Link>
        </p>
      </Card>
    </main>
  );
}
