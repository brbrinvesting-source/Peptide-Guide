import { NextRequest, NextResponse } from 'next/server'
import { readStoredFile, STORES } from '@/lib/storage'

// Public site media delivery (currently: the homepage hero image/video).
// Unauthenticated and long-cached, same storage backend as product images
// and COAs (Netlify Blobs on Netlify, local filesystem otherwise), kept in
// its own store so none of the three ever collide.

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await ctx.params
  const key = keyParts.join('/')
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase()
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let data: Buffer
  try {
    data = await readStoredFile(STORES.siteMedia, key)
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
