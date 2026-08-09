import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stockStatus, STOCK_LABELS } from '@/lib/constants'
import { InventoryAdjustForm } from './InventoryAdjustForm'
import type { Prisma } from '@prisma/client'

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
}) {
  await requireAdmin()
  const { q = '', filter = '' } = await searchParams

  const where: Prisma.ProductWhereInput = {}
  if (q.trim()) where.OR = [{ name: { contains: q.trim() } }, { sku: { contains: q.trim() } }]

  let products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      lots: { where: { isCurrent: true }, take: 1 },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    take: 300,
  })
  if (filter === 'low') products = products.filter((p) => p.inventoryQty > 0 && p.inventoryQty <= p.lowStockThreshold)
  if (filter === 'out') products = products.filter((p) => p.inventoryQty <= 0)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <Link href="/admin/inventory/history" className="btn btn-outline btn-sm">
          Inventory History
        </Link>
      </div>

      <form method="GET" className="mt-5 flex flex-wrap gap-2">
        <input type="search" name="q" defaultValue={q} placeholder="Search name or SKU…" className="field max-w-xs" aria-label="Search inventory" />
        <select name="filter" defaultValue={filter} className="field max-w-44" aria-label="Filter inventory">
          <option value="">All products</option>
          <option value="low">Low stock</option>
          <option value="out">Sold out</option>
        </select>
        <button type="submit" className="btn btn-outline btn-sm">Filter</button>
      </form>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Exact qty</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Current lot</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const st = stockStatus(p.inventoryQty, p.lowStockThreshold)
              return (
                <tr key={p.id}>
                  <td className="font-semibold">
                    <Link href={`/admin/products/${p.id}`} className="hover:text-gold">
                      {p.name} <span className="text-muted">— {p.vialSize}</span>
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="font-bold">{p.inventoryQty}</td>
                  <td className="text-muted">{p.lowStockThreshold}</td>
                  <td>
                    <span className={`badge badge-${st === 'IN_STOCK' ? 'instock' : st === 'LOW_STOCK' ? 'lowstock' : 'soldout'}`}>
                      {STOCK_LABELS[st]}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{p.lots[0]?.lotNumber ?? '—'}</td>
                  <td>
                    <details>
                      <summary className="cursor-pointer text-xs text-gold uppercase">Adjust</summary>
                      <div className="max-w-xs py-3">
                        <InventoryAdjustForm productId={p.id} currentQty={p.inventoryQty} />
                      </div>
                    </details>
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
