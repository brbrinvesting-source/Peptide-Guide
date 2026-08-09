import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export const metadata: Metadata = {
  title: 'COA & Test Results',
  robots: { index: false, follow: false },
}

export default async function CoaCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; availability?: string }>
}) {
  await requireUser()
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const categorySlug = params.category ?? ''
  const availability = params.availability ?? ''

  const where: Prisma.ProductWhereInput = { active: true }
  if (q) {
    where.OR = [{ name: { contains: q } }, { sku: { contains: q } }, { vialSize: { contains: q } }]
  }
  if (categorySlug) where.category = { slug: categorySlug }

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        coas: {
          where: { isCurrent: true, active: true },
          include: { lot: true },
          take: 1,
        },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    }),
  ])

  const rows = products
    .map((p) => ({ product: p, coa: p.coas[0] ?? null }))
    .filter((r) =>
      availability === 'available' ? r.coa !== null : availability === 'pending' ? r.coa === null : true
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="gold-keyline">
        <p className="microlabel">Research transparency</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">COA &amp; Test Results</h1>
      </div>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
        Certificates of Analysis and available testing documentation for every listed compound.
        Documentation is provided per product and, where applicable, per lot/batch.
      </p>

      <form method="GET" action="/coas" className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by compound or product name…"
          aria-label="Search COAs"
          className="field"
        />
        <select name="category" defaultValue={categorySlug} aria-label="Filter by category" className="field sm:w-52">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="availability" defaultValue={availability} aria-label="Filter by COA availability" className="field sm:w-44">
          <option value="">All products</option>
          <option value="available">COA available</option>
          <option value="pending">No COA yet</option>
        </select>
        <button type="submit" className="btn btn-outline sm:hidden">
          Apply
        </button>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.currentScript.closest('form').querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>s.form.submit()))`,
          }}
        />
      </form>

      <ul className="mt-8 space-y-3">
        {rows.length === 0 && (
          <li className="panel px-6 py-14 text-center text-sm text-muted">
            No products match your search.
          </li>
        )}
        {rows.map(({ product, coa }) => (
          <li key={product.id} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-sm font-bold tracking-[0.08em] uppercase">
                  {product.name} — {product.vialSize}
                </h2>
                {coa && <span className="badge badge-gold">COA available</span>}
                {coa?.purityVerified && (
                  <span className="badge badge-gold">
                    Verified Purity{coa.purityPercent !== null ? ` ${coa.purityPercent}%` : ''}
                  </span>
                )}
                {!coa && (
                  <span className="badge badge-neutral">
                    {product.coaComingSoon ? 'COA coming soon' : 'No COA published'}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {product.category.name}
                {coa?.testingDate &&
                  ` · Latest COA: ${coa.testingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}
                {coa?.laboratory && ` · Testing laboratory: ${coa.laboratory}`}
                {coa?.lot && ` · Lot ${coa.lot.lotNumber}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {coa ? (
                <>
                  <Link href={`/coas/${coa.id}`} className="btn btn-gold btn-sm" prefetch={false}>
                    View COA
                  </Link>
                  <a href={`/api/coa/${coa.id}/file?download=1`} className="btn btn-outline btn-sm">
                    Download
                  </a>
                </>
              ) : (
                <Link href={`/products/${product.slug}`} className="btn btn-ghost btn-sm">
                  View product
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
