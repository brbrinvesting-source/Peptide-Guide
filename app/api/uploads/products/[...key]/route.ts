import { NextRequest, NextResponse } from 'next/server'
import { readStoredFile, STORES } from '@/lib/storage'

// Public product image delivery. Unauthenticated and long-cached — these
// photos appear on public storefront pages (catalog, product detail,
// product cards), unlike COA documents which stay behind an auth check.
// Backed by the same storage abstraction as COAs (Netlify Blobs on Netlify,
// local filesystem otherwise), just a separate store so the two never mix.

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await ctx.params
  const key = keyParts.join('/')
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase()
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let data: Buffer
  try {
    data = await readStoredFile(STORES.productImages, key)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
