import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentic Commerce Discovery Readiness Scan',
  description:
    'Meet of productdata de vragen beantwoordt die een koper in een categorie stelt — voor OpenAI ACP en Google UCP.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // lang staat op nl; de taalknop in de app wisselt de inhoud, niet het document.
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
