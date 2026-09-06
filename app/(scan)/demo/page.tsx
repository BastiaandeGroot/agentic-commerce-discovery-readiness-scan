import type { Metadata } from 'next';
import { DemoContent } from './DemoContent';

const titel = 'Voorbeeldrapport';
const omschrijving =
  'Een volledig readiness-rapport op voorbeelddata. Zie wat de scan oplevert voordat je je eigen catalogus aanlevert.';

export const metadata: Metadata = {
  title: titel,
  description: omschrijving,
  openGraph: { title: titel, description: omschrijving, type: 'website', locale: 'nl_NL' },
};

export default function DemoPage() {
  return <DemoContent />;
}
