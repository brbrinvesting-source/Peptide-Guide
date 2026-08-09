import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdminRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readStoredFile } from '@/lib/storage'

// Authenticated COA document delivery. Files are stored outside public/
// and only streamed to verified customers and admins.

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || (!user.emailVerified && !isAdminRole(user.role))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await ctx.params
  const coa = await prisma.coa.findUnique({ where: { id }, include: { product: true } })
  if (!coa || (!coa.active && !isAdminRole(user.role))) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  let data: Buffer
  try {
    data = await readStoredFile(coa.storageKey)
  } catch {
    return NextResponse.json({ error: 'Document unavailable' }, { status: 404 })
  }

  const download = req.nextUrl.searchParams.get('download') === '1'
  const filename = coa.originalFilename.replace(/[^\w.\- ]/g, '_')
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': coa.mimeType || 'application/pdf',
      'Content-Length': String(data.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
