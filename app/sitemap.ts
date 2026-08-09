import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

// Only public pages are listed — the catalog requires authentication and is
// intentionally kept out of search indexes.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/contact',
    '/legal/terms',
    '/legal/privacy',
    '/legal/research-disclaimer',
    '/legal/shipping-policy',
    '/legal/refund-policy',
  ]
  return publicPaths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.5,
  }))
}
