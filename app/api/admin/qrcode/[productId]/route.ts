import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { absoluteUrl } from '@/lib/site'
import { qrPngBuffer, qrSvgString } from '@/lib/qrcode'

// On-demand QR code generation for product labels. Encodes the public
// /verify/[slug] URL — never anything account-gated, since the whole point
// is a code a customer can scan before creating an account.

export async function GET(req: NextRequest, ctx: { params: Promise<{ productId: string }> }) {
  await requireAdmin()
  const { productId } = await ctx.params
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const url = absoluteUrl(`/verify/${product.slug}`)
  const format = req.nextUrl.searchParams.get('format') === 'svg' ? 'svg' : 'png'
  const download = req.nextUrl.searchParams.get('download') === '1'
  const disposition = download ? 'attachment' : 'inline'
  const filenameBase = `${product.sku}-qr`.replace(/[^\w.-]/g, '_')

  if (format === 'svg') {
    const svg = await qrSvgString(url)
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `${disposition}; filename="${filenameBase}.svg"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  const png = await qrPngBuffer(url)
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `${disposition}; filename="${filenameBase}.png"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
