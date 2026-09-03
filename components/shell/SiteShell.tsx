import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

/** De brede layout voor de publieke pagina's en de scan. Marketing en scan
 *  delen hem met opzet: het moet één product blijven, geen doorgestuurde app. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="inhoud" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
