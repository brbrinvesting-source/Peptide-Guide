import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getBulkTiers } from '@/lib/settings'
import { formatCents, stockStatus, STOCK_LABELS } from '@/lib/constants'
import { VialImage } from '@/components/VialImage'
import { AddToCartButton } from '@/components/AddToCartButton'
import { ProductCard, type CatalogProduct } from '@/components/ProductCard'
import { formatCalendarDate } from '@/lib/dates'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({ where: { slug } })
  return {
    title: product ? `${product.name} — ${product.vialSize}` : 'Product',
    robots: { index: false, follow: false },
  }
}

const BADGE_CLASS = {
  IN_STOCK: 'badge badge-instock',
  LOW_STOCK: 'badge badge-lowstock',
  SOLD_OUT: 'badge badge-soldout',
} as const

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser()
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      coas: {
        where: { active: true },
        include: { lot: true },
        orderBy: [{ isCurrent: 'desc' }, { testingDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  })
  if (!product || !product.active) notFound()

  // getBulkTiers() returns highest-minQty-first (for pricing's early-return
  // lookup) — the table below needs ascending order to build "N–M units" rows.
  const bulkTiers = (await getBulkTiers()).sort((a, b) => a.minQty - b.minQty)
  const status = stockStatus(product.inventoryQty, product.lowStockThreshold)
  const purchasable = product.priceCents !== null && status !== 'SOLD_OUT'
  const currentCoa = product.coas.find((c) => c.isCurrent) ?? null
  const historicalCoas = product.coas.filter((c) => !c.isCurrent)

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
    include: {
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      coas: {
        where: { isCurrent: true, active: true },
        select: { id: true, purityVerified: true, purityPercent: true },
        take: 1,
      },
    },
    orderBy: { sortOrder: 'asc' },
    take: 4,
  })
  const relatedCards: CatalogProduct[] = related.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    vialSize: p.vialSize,
    priceCents: p.priceCents,
    inventoryQty: p.inventoryQty,
    lowStockThreshold: p.lowStockThreshold,
    coaComingSoon: p.coaComingSoon,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    hasCurrentCoa: p.coas.length > 0,
    currentCoaId: p.coas[0]?.id ?? null,
    purityVerified: p.coas[0]?.purityVerified ?? false,
    purityPercent: p.coas[0]?.purityPercent ?? null,
  }))

  const specs = (product.specifications ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':')
      return idx > 0 ? [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] : [null, line]
    })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/catalog" className="hover:text-fg">
          Catalog
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-fg">
          {product.category.name}
        </Link>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div className="panel aspect-square overflow-hidden">
          <VialImage
            name={product.name}
            vialSize={product.vialSize}
            imageUrl={product.images[0]?.url}
            alt={product.images[0]?.alt}
          />
        </div>

        {/* Purchase column */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={BADGE_CLASS[status]}>{STOCK_LABELS[status]}</span>
            {currentCoa?.purityVerified && (
              <span className="badge badge-gold">
                Verified Purity{currentCoa.purityPercent !== null ? ` — ${currentCoa.purityPercent}%` : ''}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm tracking-[0.16em] text-muted uppercase">
            {product.vialSize} · SKU {product.sku}
          </p>
          <p className="mt-5 text-3xl font-bold">
            {product.priceCents !== null ? formatCents(product.priceCents) : 'Pricing coming soon'}
          </p>

          {/* Bulk pricing */}
          {product.priceCents !== null && bulkTiers.length > 0 && (
            <div className="panel mt-6 overflow-hidden">
              <p className="microlabel border-b border-line px-4 py-2.5">
                Automatic bulk pricing
              </p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-line/50">
                    <td className="px-4 py-2 text-muted">1–{bulkTiers[0].minQty - 1} units</td>
                    <td className="px-4 py-2 text-right">{formatCents(product.priceCents)} / unit</td>
                  </tr>
                  {bulkTiers.map((tier, i) => {
                    const next = bulkTiers[i + 1]
                    const label = next ? `${tier.minQty}–${next.minQty - 1} units` : `${tier.minQty}+ units`
                    const unit = Math.round(product.priceCents! - (product.priceCents! * tier.percentOff) / 100)
                    return (
                      <tr key={tier.minQty} className="border-b border-line/50 last:border-0">
                        <td className="px-4 py-2 text-muted">{label}</td>
                        <td className="px-4 py-2 text-right">
                          {formatCents(unit)} / unit{' '}
                          <span className="text-gold">({tier.percentOff}% off)</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6">
            <AddToCartButton
              productId={product.id}
              disabled={!purchasable}
              disabledLabel={product.priceCents === null ? 'Coming Soon' : 'Sold Out'}
              showQuantity
              maxQuantity={Math.max(product.inventoryQty, 1)}
            />
          </div>

          <p className="mt-5 rounded-md border border-line bg-panel px-4 py-3 text-xs leading-relaxed text-muted">
            For research use only. Not for human or veterinary consumption. See the{' '}
            <Link href="/legal/research-disclaimer" className="text-gold hover:text-gold-bright">
              Research Use Disclaimer
            </Link>
            .
          </p>

          {/* Description + specs */}
          {product.description && (
            <section className="mt-8" aria-labelledby="desc-heading">
              <h2 id="desc-heading" className="microlabel">
                Description
              </h2>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-fg/90">
                {product.description}
              </p>
            </section>
          )}
          {specs.length > 0 && (
            <section className="mt-8" aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="microlabel">
                Specifications
              </h2>
              <dl className="mt-3 divide-y divide-line/50 border-y border-line/50 text-sm">
                {specs.map(([label, value], i) => (
                  <div key={i} className="flex justify-between gap-6 py-2.5">
                    {label && <dt className="text-muted">{label}</dt>}
                    <dd className={label ? 'text-right' : ''}>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {/* COA section */}
      <section className="mt-14" aria-labelledby="coa-heading">
        <div className="gold-keyline">
          <p className="microlabel">Documentation</p>
          <h2 id="coa-heading" className="mt-2 text-2xl font-bold tracking-tight">
            Certificate of Analysis
          </h2>
        </div>
        {currentCoa ? (
          <div className="mt-6 space-y-4">
            <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="badge badge-gold">Current COA</span>{' '}
                {currentCoa.purityVerified && (
                  <span className="badge badge-gold">
                    Verified Purity{currentCoa.purityPercent !== null ? ` — ${currentCoa.purityPercent}%` : ''}
                  </span>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
                  {currentCoa.testingDate && (
                    <div>
                      <dt className="text-xs text-muted">Testing date</dt>
                      <dd>{formatCalendarDate(currentCoa.testingDate, { year: 'numeric', month: 'long' })}</dd>
                    </div>
                  )}
                  {currentCoa.laboratory && (
                    <div>
                      <dt className="text-xs text-muted">Laboratory</dt>
                      <dd>{currentCoa.laboratory}</dd>
                    </div>
                  )}
                  {currentCoa.coaNumber && (
                    <div>
                      <dt className="text-xs text-muted">COA number</dt>
                      <dd>{currentCoa.coaNumber}</dd>
                    </div>
                  )}
                  {currentCoa.lot && (
                    <div>
                      <dt className="text-xs text-muted">Lot / batch</dt>
                      <dd>{currentCoa.lot.lotNumber}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/coas/${currentCoa.id}`} className="btn btn-gold btn-sm" prefetch={false}>
                  View COA
                </Link>
                <a href={`/api/coa/${currentCoa.id}/file?download=1`} className="btn btn-outline btn-sm">
                  Download
                </a>
              </div>
            </div>

            {historicalCoas.length > 0 && (
              <details className="panel overflow-hidden">
                <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold tracking-wide select-none">
                  Previous certificates ({historicalCoas.length})
                </summary>
                <ul className="divide-y divide-line/50 border-t border-line">
                  {historicalCoas.map((coa) => (
                    <li key={coa.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="text-muted">
                        {coa.testingDate
                          ? formatCalendarDate(coa.testingDate, { year: 'numeric', month: 'long' })
                          : 'Undated'}
                        {coa.laboratory ? ` · ${coa.laboratory}` : ''}
                        {coa.lot ? ` · Lot ${coa.lot.lotNumber}` : ''}
                      </span>
                      <span className="flex gap-2">
                        <Link href={`/coas/${coa.id}`} className="btn btn-ghost btn-sm" prefetch={false}>
                          View
                        </Link>
                        <a href={`/api/coa/${coa.id}/file?download=1`} className="btn btn-ghost btn-sm">
                          Download
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : (
          <p className="panel mt-6 px-5 py-6 text-sm text-muted">
            {product.coaComingSoon
              ? 'COA coming soon for this product.'
              : 'No COA is currently published for this product.'}{' '}
            Check the <Link href="/coas" className="text-gold">COA &amp; Test Results Center</Link> for
            available documentation across the catalog.
          </p>
        )}
      </section>

      {/* Related */}
      {relatedCards.length > 0 && (
        <section className="mt-14" aria-labelledby="related-heading">
          <h2 id="related-heading" className="gold-keyline text-2xl font-bold tracking-tight">
            Related products
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {relatedCards.map((p) => (
              <ProductCard key={p.id} product={p} bulkTiers={bulkTiers} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
