import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents, ORDER_STATUSES } from '@/lib/constants'
import type { Prisma } from '@prisma/client'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireAdmin()
  const { q = '', status = '', page: pageRaw } = await searchParams
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const perPage = 50

  const where: Prisma.OrderWhereInput = {}
  if (q.trim()) {
    where.OR = [
      { orderNumber: { contains: q.trim() } },
      { customerEmail: { contains: q.trim() } },
      { customerName: { contains: q.trim() } },
      { trackingNumber: { contains: q.trim() } },
    ]
  }
  if (status) where.status = status

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: { select: { quantity: true } } },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>

      <form method="GET" className="mt-5 flex flex-wrap gap-2">
        <input type="search" name="q" defaultValue={q} placeholder="Order #, email, tracking…" className="field max-w-xs" aria-label="Search orders" />
        <select name="status" defaultValue={status} className="field max-w-52" aria-label="Filter by status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-outline btn-sm">Filter</button>
      </form>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Units</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-gold">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-xs text-muted">{o.createdAt.toLocaleDateString('en-US')}</td>
                <td className="max-w-52 truncate text-muted">{o.customerEmail}</td>
                <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="font-semibold">{formatCents(o.totalCents)}</td>
                <td>
                  <span className={`badge ${o.paymentStatus === 'PAID' ? 'badge-instock' : o.paymentStatus === 'FAILED' ? 'badge-danger' : 'badge-neutral'}`}>
                    {o.paymentStatus.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="text-xs">{o.status.replaceAll('_', ' ')}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-muted">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`?q=${q}&status=${status}&page=${page - 1}`} className="btn btn-outline btn-sm">← Prev</Link>}
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?q=${q}&status=${status}&page=${page + 1}`} className="btn btn-outline btn-sm">Next →</Link>}
        </nav>
      )}
    </div>
  )
}
