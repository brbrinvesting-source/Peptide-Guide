import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  experimental: {
    // Next.js defaults Server Action request bodies to 1MB, which silently
    // rejects the request before it reaches our code. Product image uploads
    // (app/actions/admin.ts setProductImageAction) and COA PDF uploads
    // (uploadCoaAction) both allow files up to 8MB, so the body limit needs
    // headroom above that for multipart overhead.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
