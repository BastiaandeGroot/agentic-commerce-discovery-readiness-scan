// Serverpagina: alleen de metadata. De inhoud is een client component, want de
// taalkeuze leeft in de browser en een server component kan die niet lezen.

import type { Metadata } from 'next';
import { HomeContent } from './HomeContent';

const titel = 'Is je productdata klaar voor AI-agenten?';
const omschrijving =
  'Scan je productcatalogus en zie welke vragen van een koper je data kan beantwoorden. Gratis, geen account, en je bestand verlaat je apparaat niet.';

export const metadata: Metadata = {
  title: titel,
  description: omschrijving,
  openGraph: { title: titel, description: omschrijving, type: 'website', locale: 'nl_NL' },
  twitter: { card: 'summary_large_image', title: titel, description: omschrijving },
};

export default function HomePage() {
  return <HomeContent />;
}
