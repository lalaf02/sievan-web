import type { Metadata } from 'next';
import { Source_Serif_4, Inter, Roboto_Condensed } from 'next/font/google';
import '@/design/tokens.css';
import '@/design/primitives.css';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { themeScript } from '@/design';

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

const display = Roboto_Condensed({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

const siteDescription =
  'The archive of Maurice Sievan (1898–1981): press coverage, oral-history interviews, ' +
  'exhibition history and works.';

export const metadata: Metadata = {
  title: {
    default: 'Maurice Sievan',
    template: '%s · Maurice Sievan',
  },
  description: siteDescription,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Maurice Sievan Archive',
    title: 'Maurice Sievan',
    description: siteDescription,
  },
  twitter: {
    card: 'summary',
    title: 'Maurice Sievan',
    description: siteDescription,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-site="public" className={`${serif.variable} ${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Restores an explicit dark choice before first paint. Light is the
          default and carries no attribute, so the prerendered HTML is already
          correct for everyone who has not chosen otherwise, and this only ever
          runs to prevent a flash for those who have.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SiteHeader />
        <main id="main" tabIndex={-1} style={{ flex: 1, paddingBottom: 'var(--s-8)' }}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
