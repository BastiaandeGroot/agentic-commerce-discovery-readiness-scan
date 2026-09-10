'use client';

// Layout voor het dashboard: zijbalk, accountwissel bovenin, dichtere opmaak.
//
// Dichter dan de publieke kant met opzet — wie hier komt heeft al gescand en
// wil zijn scans naast elkaar zien, niet opnieuw overtuigd worden.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronDown, Inbox, LayoutGrid, ListChecks, Radar, Settings, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { STRINGS } from '../../src/i18n/strings';
import { authHeader } from '../../src/auth/client';
import { useAuth } from '../auth/AuthProvider';
import { useLocale } from '../../src/i18n/useLocale';

const LINKS = [
  { href: '/dashboard', key: 'overview', Icon: LayoutGrid },
  { href: '/dashboard/scans', key: 'scans', Icon: ListChecks },
  // Alleen zichtbaar voor beheerders. De pagina zelf beslist dat serverzijdig;
  // dit is navigatie en geen slot.
  { href: '/dashboard/aanvragen', key: 'requests', Icon: Inbox, admin: true },
  { href: '/dashboard/winkelscan', key: 'shopScan', Icon: Radar, admin: true },
  { href: '/dashboard/instellingen', key: 'settings', Icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [locale] = useLocale();
  const pathname = usePathname();
  const s = STRINGS[locale];
  const { user } = useAuth();

  /**
   * Of deze bezoeker beheerder is.
   *
   * Eén vraag aan de server, want de browser kan dit niet weten en mag het ook
   * niet bepalen. Dit is navigatie en geen slot: de pagina zelf weigert
   * onafhankelijk hiervan. Zonder deze vraag zou een merchant "Aanvragen" in zijn
   * menu zien staan en daar te horen krijgen dat het niet voor hem is.
   */
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const response = await fetch('/api/admin/queue', { headers: await authHeader() });
        if (alive) setAdmin(response.ok);
      } catch {
        // Niet kunnen vragen betekent: geen beheerdersmenu. Dat is de veilige kant.
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex flex-col gap-3 px-4 py-3 md:h-full md:py-4">
          {/* Wie er is ingelogd. De wissel zelf is uitgezet: er is één account
              per gebruiker, en een knop die niets doet is erger dan geen knop.
              Het adres staat er wél, want wie op twee accounts test moet kunnen
              zien met welke hij kijkt. */}
          <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm">
            <span className="min-w-0">
              <span className="block text-xs text-muted">{s.shell.account}</span>
              <span className="block truncate text-ink">
                {user === undefined ? '\u2026' : user?.email ?? s.shell.accountPlaceholder}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
          </div>

          <nav aria-label={s.shell.menu} className="flex flex-row gap-1 md:flex-col">
            {LINKS.filter((link) => !link.admin || admin).map(({ href, key, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    active ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{s.shell.appNav[key]}</span>
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            className="mt-auto hidden items-center gap-1.5 text-xs text-muted underline underline-offset-2 transition hover:text-ink md:flex"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {s.shell.backToSite}
          </Link>
        </div>
      </aside>

      <main id="inhoud" className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
