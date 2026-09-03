'use client';

// Landingspagina. In deze stap alleen de vorm: echte navigatie, echte teksten,
// echte componenten. Stap 7 vult hem met de uitleg in drie stappen, het
// privacyblok, de FAQ en een echt stuk rapport.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { STRINGS } from '../../src/i18n/strings';
import { useLocale } from '../../src/i18n/useLocale';
import { Card, CardTitle } from '../../components/ui';

export default function HomePage() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <div className="space-y-12">
      {/* Instap: ruim. De dichtheid van het rapport hoort hier niet. */}
      <section className="max-w-2xl py-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">{s.pages.home.title}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{s.pages.home.intro}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-base font-medium text-white transition hover:opacity-90"
          >
            {s.shell.primaryAction}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/scan"
            className="rounded-lg border border-line bg-surface px-5 py-2.5 text-base font-medium transition hover:bg-surface-2"
          >
            {s.shell.nav.scan}
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">{s.pages.home.secondary}</p>
      </section>

      <Card>
        <CardTitle>{s.shell.nav.demo}</CardTitle>
        <p className="text-sm leading-relaxed text-muted">{s.pages.home.todo}</p>
      </Card>
    </div>
  );
}
