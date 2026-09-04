// Alleen metadata. De pagina zelf is een client component vanwege de taalkeuze,
// en die kan geen metadata exporteren; een layout wel.
import type { Metadata } from 'next';

const titel = 'Over deze scan';
const omschrijving =
  'Een deterministische scan die meet of je productcatalogus de vragen van een koper beantwoordt.';

export const metadata: Metadata = {
  title: titel,
  description: omschrijving,
  openGraph: { title: titel, description: omschrijving, type: 'website', locale: 'nl_NL' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
