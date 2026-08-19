import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readStoredFile } from '@/lib/storage'

// Public COA document delivery for the /verify/[slug] lookup page (the QR
// code destination on physical labels). Intentionally unauthenticated, but
// scoped tightly: only the CURRENT, ACTIVE certificate for an ACTIVE
// product is ever reachable here — never an arbitrary/historical COA id,
// and this route never lists or enumerates documents.

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { coas: { where: { isCurrent: true, active: true }, take: 1 } },
  })
  const coa = product?.active ? (product.coas[0] ?? null) : null
  if (!coa) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  let data: Buffer
  try {
    data = await readStoredFile(coa.storageKey)
  } catch {
    return NextResponse.json({ error: 'Document unavailable' }, { status: 404 })
  }

  const filename = coa.originalFilename.replace(/[^\w.\- ]/g, '_')
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': coa.mimeType || 'application/pdf',
      'Content-Length': String(data.length),
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
