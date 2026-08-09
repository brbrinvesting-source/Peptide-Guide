import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getBulkTiers } from '@/lib/settings'
import { ProductCard, type CatalogProduct } from '@/components/ProductCard'
import type { Prisma } from '@prisma/client'

export const metadata: Metadata = {
  title: 'Product Catalog',
  robots: { index: false, follow: false },
}

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ featured: 'desc' }, { sortOrder: 'asc' }],
  'price-asc': [{ priceCents: 'asc' }, { sortOrder: 'asc' }],
  'price-desc': [{ priceCents: 'desc' }, { sortOrder: 'asc' }],
  'name-asc': [{ name: 'asc' }, { vialSize: 'asc' }],
  'name-desc': [{ name: 'desc' }, { vialSize: 'desc' }],
  newest: [{ createdAt: 'desc' }],
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; availability?: string; page?: string }>
}) {
  await requireUser()
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const categorySlug = params.category ?? ''
  const sort = SORTS[params.sort ?? ''] ? params.sort! : 'featured'
  const availability = params.availability ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const perPage = 24

  const where: Prisma.ProductWhereInput = { active: true }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { sku: { contains: q } },
      { vialSize: { contains: q } },
      { description: { contains: q } },
      { category: { name: { contains: q } } },
    ]
  }
  if (categorySlug) where.category = { slug: categorySlug }
  if (availability === 'in-stock') where.inventoryQty = { gt: 0 }
  if (availability === 'sold-out') where.inventoryQty = { lte: 0 }

  const [categories, bulkTiers, total, products] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getBulkTiers(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        coas: { where: { isCurrent: true, active: true }, select: { id: true }, take: 1 },
      },
      orderBy: SORTS[sort],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  const cards: CatalogProduct[] = products.map((p) => ({
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
  }))

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const buildQuery = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (categorySlug) sp.set('category', categorySlug)
    if (sort !== 'featured') sp.set('sort', sort)
    if (availability) sp.set('availability', availability)
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    const s = sp.toString()
    return s ? `/catalog?${s}` : '/catalog'
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="gold-keyline">
          <p className="microlabel">Research catalog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Catalog</h1>
        </div>
        <p className="text-xs text-muted">
          {total} product{total === 1 ? '' : 's'}
        </p>
      </div>

      {/* Search + filters — plain GET form, works without JS */}
      <form method="GET" action="/catalog" className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, SKU, or category…"
            aria-label="Search products"
            className="field pl-10"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          >
            <circle cx="7.5" cy="7.5" r="5.75" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <select name="category" defaultValue={categorySlug} aria-label="Filter by category" className="field sm:w-52">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="availability" defaultValue={availability} aria-label="Filter by availability" className="field sm:w-40">
          <option value="">All availability</option>
          <option value="in-stock">In stock</option>
          <option value="sold-out">Sold out</option>
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort products" className="field sm:w-48">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name-asc">Name: A–Z</option>
          <option value="name-desc">Name: Z–A</option>
          <option value="newest">Newest</option>
        </select>
        <button type="submit" className="btn btn-outline sm:hidden">
          Apply
        </button>
        <noscript>
          <button type="submit" className="btn btn-outline hidden sm:inline-flex">
            Apply
          </button>
        </noscript>
        <AutoSubmit />
      </form>

      {cards.length === 0 ? (
        <div className="panel mt-10 px-6 py-16 text-center">
          <p className="text-sm text-muted">No products match your search.</p>
          <Link href="/catalog" className="btn btn-outline btn-sm mt-5">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((p) => (
            <ProductCard key={p.id} product={p} bulkTiers={bulkTiers} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={buildQuery({ page: String(page - 1) })} className="btn btn-outline btn-sm">
              ← Previous
            </Link>
          )}
          <span className="px-3 text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildQuery({ page: String(page + 1) })} className="btn btn-outline btn-sm">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

// Auto-submits filter selects on change (progressive enhancement)
function AutoSubmit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.currentScript.closest('form').querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>s.form.submit()))`,
      }}
    />
  )
}
