// Alleen metadata. De pagina zelf is een client component vanwege de taalkeuze,
// en die kan geen metadata exporteren; een layout wel.
import type { Metadata } from 'next';

const titel = 'Rapport';
const omschrijving =
  'Het resultaat van een readiness-scan op je eigen productfeed.';

export const metadata: Metadata = {
  title: titel,
  description: omschrijving,
  openGraph: { title: titel, description: omschrijving, type: 'website', locale: 'nl_NL' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
