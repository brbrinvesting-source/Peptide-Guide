import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

// Authenticated areas are excluded from crawling; they are also protected
// server-side and send noindex metadata.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/catalog', '/products/', '/coas', '/cart', '/checkout', '/account', '/admin', '/api/'],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
