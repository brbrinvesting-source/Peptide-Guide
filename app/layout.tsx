import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16a34a',
};

export const metadata: Metadata = {
  title: 'Peptide Guide | Research-Backed Peptide Information',
  description:
    'A comprehensive, research-backed reference for peptides — covering mechanisms, dosing protocols, goal-based recommendations, stacking guides, and cycle building tools.',
  keywords: ['peptides', 'peptide guide', 'BPC-157', 'GHK-Cu', 'research peptides', 'peptide dosing', 'peptide stacking'],
  openGraph: {
    title: 'Peptide Guide | Research-Backed Peptide Information',
    description:
      'Comprehensive peptide reference covering mechanisms, dosing, goal-based recommendations, stacking, and cycle building.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
