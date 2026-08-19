import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RESEARCH_DISCLAIMER_SHORT } from '@/lib/constants'
import { formatCalendarDate } from '@/lib/dates'

// Public, read-only COA verification page — the destination of the QR code
// printed on physical vial labels. Deliberately outside the account wall
// that gates the rest of the site: anyone scanning a label (a customer, a
// regulator, someone verifying authenticity before buying) can see the
// certificate for that exact product without registering. No pricing,
// catalog, or purchasing surface is exposed here.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({ where: { slug } })
  return {
    title: product ? `Verify — ${product.name} ${product.vialSize}` : 'Verify Certificate of Analysis',
    robots: { index: false, follow: false },
  }
}

export default async function VerifyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      coas: {
        where: { isCurrent: true, active: true },
        include: { lot: true },
        take: 1,
      },
    },
  })
  if (!product || !product.active) notFound()

  const coa = product.coas[0] ?? null

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="microlabel text-gold">Certificate Verification</p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
        {product.name} <span className="text-muted">— {product.vialSize}</span>
      </h1>
      <p className="mt-1 font-mono text-xs text-muted">SKU {product.sku}</p>

      <div className="panel mt-6 p-5">
        {coa ? (
          <>
            <dl className="space-y-3 text-sm">
              {coa.lot?.lotNumber && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Lot number</dt>
                  <dd className="font-mono font-semibold">{coa.lot.lotNumber}</dd>
                </div>
              )}
              {coa.testingDate && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Testing date</dt>
                  <dd>{formatCalendarDate(coa.testingDate, { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                </div>
              )}
              {coa.laboratory && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Laboratory</dt>
                  <dd>{coa.laboratory}</dd>
                </div>
              )}
              {coa.purityVerified && coa.purityPercent !== null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Verified purity</dt>
                  <dd className="font-semibold text-gold">{coa.purityPercent}%</dd>
                </div>
              )}
            </dl>
            <a
              href={`/api/verify/${product.slug}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold mt-5 w-full"
            >
              View Certificate (PDF)
            </a>
          </>
        ) : (
          <p className="text-sm text-muted">
            A Certificate of Analysis is not yet available for this product.
          </p>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">{RESEARCH_DISCLAIMER_SHORT}</p>
    </div>
  )
}
