'use client';

// Header voor de publieke kant en de scan. Bewust smal gehouden: navigatie, de
// taalkeuze en één duidelijke actie. Alles wat hier bij komt, concurreert met
// die actie.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { STRINGS } from '../../src/i18n/strings';
import { useLocale } from '../../src/i18n/useLocale';
import { LanguageToggle } from '../LanguageToggle';
import { useAuth } from '../auth/AuthProvider';

const LINKS = [
  { href: '/scan', key: 'scan' },
  { href: '/demo', key: 'demo' },
  { href: '/methode', key: 'methode' },
  { href: '/prijzen', key: 'prijzen' },
  { href: '/over', key: 'over' },
];

export function SiteHeader() {
  const [locale, setLocale] = useLocale();
  const { user, configured, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const s = STRINGS[locale];

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto min-w-0 font-display text-base font-semibold tracking-tight">
          {s.appName}
        </Link>

        {/* Op smalle schermen achter een knop; de navigatie mag de kop niet
            over drie regels duwen. */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={s.shell.menu}
          className="rounded-md border border-line p-1.5 text-muted transition hover:text-ink sm:hidden"
        >
          {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        </button>

        <nav
          aria-label={s.shell.menu}
          className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-1 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-5`}
        >
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md py-1.5 text-sm transition sm:py-0 ${
                  active ? 'font-medium text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {s.shell.nav[link.key]}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <LanguageToggle locale={locale} onChange={setLocale} label={s.language} />
          {/* Alleen tonen als er een accountdienst is. Een inloglink die naar
              een scherm wijst dat zegt dat inloggen niet aanstaat, is een
              doodlopende weg in de navigatie. */}
          {configured ? (
            user ? (
              <>
                {/* De weg terug naar je eigen kant van de app. Wie ingelogd is,
                    kwam ergens vandaan — zijn bewaarde scans, zijn aanvragen —
                    en die kon hij vanaf hier alleen terugvinden door het adres
                    te typen. Uitloggen was de enige knop die zijn account
                    erkende, en dat is een vreemde enige uitweg. */}
                <Link
                  href="/dashboard"
                  className="rounded-md text-sm font-medium text-ink transition hover:text-accent"
                >
                  {s.shell.nav.dashboard}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-md text-sm text-muted transition hover:text-ink"
                >
                  {s.auth.signOut}
                </button>
              </>
            ) : (
              <Link href="/inloggen" className="rounded-md text-sm text-muted transition hover:text-ink">
                {s.auth.signIn}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}
