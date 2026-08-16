import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/dates'

const REASON_LABEL: Record<string, string> = {
  INITIAL: 'Initial',
  RESTOCK: 'Restock',
  SALE: 'Sale',
  MANUAL_CORRECTION: 'Correction',
  DAMAGED: 'Damaged',
  LOST: 'Lost',
  REFUND_RESTOCK: 'Refund restock',
  OTHER: 'Other',
}

export default async function InventoryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const { page: pageRaw } = await searchParams
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const perPage = 50

  const [total, transactions] = await Promise.all([
    prisma.inventoryTransaction.count(),
    prisma.inventoryTransaction.findMany({
      include: { product: true, admin: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div>
      <nav className="text-xs text-muted">
        <Link href="/admin/inventory" className="hover:text-fg">Inventory</Link>
        <span className="mx-2">/</span>History
      </nav>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Inventory history</h1>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              <th>Change</th>
              <th>Prev → New</th>
              <th>Reason</th>
              <th>By</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap text-xs text-muted">{formatDateTime(t.createdAt)}</td>
                <td className="font-semibold">{t.product.name} <span className="text-muted">— {t.product.vialSize}</span></td>
                <td className={t.delta >= 0 ? 'text-success' : 'text-danger'}>{t.delta >= 0 ? `+${t.delta}` : t.delta}</td>
                <td className="text-muted">{t.previousQty} → {t.newQty}</td>
                <td>{REASON_LABEL[t.reason] ?? t.reason}</td>
                <td className="text-xs text-muted">{t.admin?.email ?? (t.reason === 'SALE' ? 'system' : '—')}</td>
                <td className="max-w-56 truncate text-xs text-muted">{t.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`?page=${page - 1}`} className="btn btn-outline btn-sm">← Prev</Link>}
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?page=${page + 1}`} className="btn btn-outline btn-sm">Next →</Link>}
        </nav>
      )}
    </div>
  )
}
