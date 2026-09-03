'use client';

import Link from 'next/link';
import { STRINGS } from '../../src/i18n/strings';
import { useLocale } from '../../src/i18n/useLocale';

export function SiteFooter() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <p className="max-w-md leading-relaxed text-muted">{s.shell.footerNote}</p>
        <nav aria-label={s.shell.menu} className="flex flex-wrap gap-x-5 gap-y-2">
          {['methode', 'prijzen', 'over'].map((key) => (
            <Link
              key={key}
              href={key === 'methode' ? '/methode' : `/${key}`}
              className="text-muted underline underline-offset-2 transition hover:text-ink"
            >
              {s.shell.nav[key]}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
