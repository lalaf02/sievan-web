import type { Metadata } from 'next';
import { Source_Serif_4, Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const serif = Source_Serif_4({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Maurice Sievan',
    template: '%s · Maurice Sievan',
  },
  description:
    'The archive of Maurice Sievan (1898–1981): press coverage, oral-history interviews, ' +
    'exhibition history and works.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SiteHeader />
        <main id="main" style={{ flex: 1, paddingBottom: 'var(--s-8)' }}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
