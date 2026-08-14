import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteGate } from '@/components/SiteGate'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'All-Access Peptides — Research Compounds & COA Documentation',
    template: '%s — All-Access Peptides',
  },
  description:
    'Research-use-only compounds with transparent Certificates of Analysis. For research use only — not for human or veterinary consumption.',
  openGraph: {
    siteName: 'All-Access Peptides',
    type: 'website',
    title: 'All-Access Peptides',
    description:
      'Research-use-only compounds with transparent Certificates of Analysis.',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteGate />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
