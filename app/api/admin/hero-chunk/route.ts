import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminOrNull } from '@/lib/auth'
import { setSetting, SETTING_KEYS } from '@/lib/settings'
import { storeFile, storeFileAtKey, readStoredFile, deleteStoredFile, STORES } from '@/lib/storage'
import { audit } from '@/lib/audit'

// Chunked upload for the homepage hero image/video. A Server Action's
// request body is subject to Netlify's own function-platform payload cap
// (observed ~6MB, well under next.config.ts's serverActions.bodySizeLimit —
// see lib/storage.ts and app/actions/admin.ts for the full story), so a
// video of any real size needs to be split into pieces client-side, each
// posted separately, then reassembled here once all pieces have arrived.

const ALLOWED: Record<string, { ext: string; type: 'image' | 'video' }> = {
  'image/jpeg': { ext: '.jpg', type: 'image' },
  'image/png': { ext: '.png', type: 'image' },
  'image/webp': { ext: '.webp', type: 'image' },
  'image/avif': { ext: '.avif', type: 'image' },
  'video/mp4': { ext: '.mp4', type: 'video' },
  'video/webm': { ext: '.webm', type: 'video' },
}

const MAX_TOTAL_BYTES = 150 * 1024 * 1024 // 150MB reassembled — generous for a hero video
const MAX_CHUNKS = 2000

function chunkKey(uploadId: string, index: number): string {
  return `hero-chunks/${uploadId}/${index}`
}

export async function POST(req: NextRequest) {
  const admin = await getAdminOrNull()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const phase = String(formData.get('phase') ?? '')
  const uploadId = String(formData.get('uploadId') ?? '')
  if (!uploadId || uploadId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    return NextResponse.json({ error: 'Invalid upload id.' }, { status: 400 })
  }

  if (phase === 'chunk') {
    const index = Number(formData.get('index'))
    const chunk = formData.get('chunk') as File | null
    if (!chunk || chunk.size === 0 || !Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) {
      return NextResponse.json({ error: 'Invalid chunk.' }, { status: 400 })
    }
    const buffer = Buffer.from(await chunk.arrayBuffer())
    await storeFileAtKey(STORES.siteMedia, chunkKey(uploadId, index), buffer)
    return NextResponse.json({ ok: true })
  }

  if (phase === 'finalize') {
    const total = Number(formData.get('total'))
    const mimeType = String(formData.get('mimeType') ?? '')
    const match = ALLOWED[mimeType]
    if (!match || !Number.isInteger(total) || total <= 0 || total > MAX_CHUNKS) {
      return NextResponse.json({ error: 'Invalid finalize request.' }, { status: 400 })
    }

    const parts: Buffer[] = []
    let totalBytes = 0
    for (let i = 0; i < total; i++) {
      let part: Buffer
      try {
        part = await readStoredFile(STORES.siteMedia, chunkKey(uploadId, i))
      } catch {
        return NextResponse.json({ error: `Upload incomplete (missing part ${i + 1} of ${total}) — try again.` }, { status: 400 })
      }
      totalBytes += part.length
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: 'File too large once reassembled (over 150MB).' }, { status: 400 })
      }
      parts.push(part)
    }

    const full = Buffer.concat(parts)
    const key = await storeFile(STORES.siteMedia, 'hero', match.ext, full)
    const url = `/api/uploads/site/${key}`

    await setSetting(SETTING_KEYS.HERO_MEDIA_URL, url)
    await setSetting(SETTING_KEYS.HERO_MEDIA_TYPE, match.type)
    await audit({
      userId: admin.id,
      action: 'HERO_MEDIA_UPDATED',
      objectType: 'Settings',
      objectId: 'homepage',
      after: { url, type: match.type, bytes: full.length },
    })

    // Best-effort cleanup — a leftover temp chunk never gets served publicly
    // (the public route only reads the "hero/" prefix's final keys) so this
    // isn't load-bearing, just tidy.
    for (let i = 0; i < total; i++) {
      await deleteStoredFile(STORES.siteMedia, chunkKey(uploadId, i))
    }

    revalidatePath('/')
    return NextResponse.json({ ok: true, url, type: match.type })
  }

  return NextResponse.json({ error: 'Unknown phase.' }, { status: 400 })
}
