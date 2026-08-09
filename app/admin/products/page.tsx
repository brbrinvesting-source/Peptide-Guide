import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents, stockStatus, STOCK_LABELS } from '@/lib/constants'
import type { Prisma } from '@prisma/client'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  await requireAdmin()
  const { q = '', category = '' } = await searchParams

  const where: Prisma.ProductWhereInput = {}
  if (q.trim()) where.OR = [{ name: { contains: q.trim() } }, { sku: { contains: q.trim() } }]
  if (category) where.category = { slug: category }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, coas: { where: { isCurrent: true, active: true }, take: 1 } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      take: 300,
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Link href="/admin/products/new" className="btn btn-gold btn-sm">
          + Add Product
        </Link>
      </div>

      <form method="GET" className="mt-5 flex flex-wrap gap-2">
        <input type="search" name="q" defaultValue={q} placeholder="Search name or SKU…" className="field max-w-xs" aria-label="Search products" />
        <select name="category" defaultValue={category} className="field max-w-52" aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-outline btn-sm">Filter</button>
      </form>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Inventory</th>
              <th>Status</th>
              <th>COA</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const st = stockStatus(p.inventoryQty, p.lowStockThreshold)
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-gold">
                      {p.name} <span className="text-muted">— {p.vialSize}</span>
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="text-muted">{p.category.name}</td>
                  <td>{p.priceCents !== null ? formatCents(p.priceCents) : <span className="text-danger">unset</span>}</td>
                  <td>{p.inventoryQty}</td>
                  <td>
                    <span className={`badge badge-${st === 'IN_STOCK' ? 'instock' : st === 'LOW_STOCK' ? 'lowstock' : 'soldout'}`}>
                      {STOCK_LABELS[st]}
                    </span>
                  </td>
                  <td>{p.coas.length > 0 ? <span className="text-gold">✓</span> : <span className="text-muted">—</span>}</td>
                  <td className="text-xs text-muted">
                    {!p.active && 'inactive '}
                    {p.featured && '★ featured'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
