import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Peptide Guide',
    short_name: 'Peptide Guide',
    description: 'Research-backed peptide reference, stacking guide, and cycle builder',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#16a34a',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  }
}
