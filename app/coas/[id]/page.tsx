import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Certificate of Analysis',
  robots: { index: false, follow: false },
}

export default async function CoaViewerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const coa = await prisma.coa.findUnique({
    where: { id },
    include: { product: true, lot: true },
  })
  if (!coa || !coa.active) notFound()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/coas" className="hover:text-fg">
          COA &amp; Test Results
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/products/${coa.product.slug}`} className="hover:text-fg">
          {coa.product.name} — {coa.product.vialSize}
        </Link>
      </nav>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {coa.product.name} — {coa.product.vialSize}
          </h1>
          <p className="mt-1.5 text-xs text-muted">
            {coa.isCurrent ? 'Current COA' : 'Historical COA'}
            {coa.testingDate &&
              ` · Tested ${coa.testingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}
            {coa.laboratory && ` · ${coa.laboratory}`}
            {coa.coaNumber && ` · ${coa.coaNumber}`}
            {coa.lot && ` · Lot ${coa.lot.lotNumber}`}
          </p>
          {coa.purityVerified && (
            <span className="badge badge-gold mt-2 inline-flex">
              Verified Purity{coa.purityPercent !== null ? ` — ${coa.purityPercent}%` : ''}
            </span>
          )}
        </div>
        <a href={`/api/coa/${coa.id}/file?download=1`} className="btn btn-gold btn-sm">
          Download COA
        </a>
      </div>

      <div className="panel mt-6 overflow-hidden">
        <iframe
          src={`/api/coa/${coa.id}/file`}
          title={`Certificate of Analysis — ${coa.product.name} ${coa.product.vialSize}`}
          className="h-[75vh] w-full bg-white"
        />
      </div>
      <p className="mt-4 text-xs text-muted">
        If the document does not display on your device, use the download button above.
      </p>
    </div>
  )
}
