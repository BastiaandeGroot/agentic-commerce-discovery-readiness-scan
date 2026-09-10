import type { Metadata } from 'next';
import { Figtree, Fraunces } from 'next/font/google';
import './globals.css';

// Twee echte letters in plaats van de systeemstack.
//
// Figtree is een humanistische schreefloze met een grote x-hoogte en zachte
// uiteinden: goed leesbaar in een dichte tabel, maar vriendelijker dan de
// systeemletter, die op een Mac neutraal-technisch oogt. Fraunces staat alleen
// boven koppen op de instapkant; een schreefletter maakt daar meteen dat het
// door mensen geschreven lijkt in plaats van door een dashboard uitgespuugd.
const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
});
import { LocaleProvider } from '../src/i18n/useLocale';
import { ToastProvider } from '../components/ui';
import { AuthProvider } from '../components/auth/AuthProvider';
import { SITE_URL } from '../src/site';

export const metadata: Metadata = {
  // Zonder dit blijven de afbeeldingen en adressen in de deelkaartjes relatief,
  // en dan toont een gedeelde link niets. De losse pagina's zetten hun eigen
  // titel en omschrijving; dit is het adres waar die aan hangen.
  metadataBase: new URL(SITE_URL),
  title: 'Agentic Commerce Discovery Readiness Scan',
  description:
    'Meet of een productcatalogus de vragen beantwoordt die een koper in zijn markt stelt.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang staat op nl; de taalknop in de app wisselt de inhoud, niet het document.
  return (
    <html lang="nl" className={`h-full antialiased ${sans.variable} ${display.variable}`}>
      <body className="min-h-full">
        <LocaleProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
