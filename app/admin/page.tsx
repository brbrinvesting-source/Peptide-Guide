import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'

function dashboardDates(): { today: Date; weekAgo: Date; monthAgo: Date } {
  const now = Date.now()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return {
    today,
    weekAgo: new Date(now - 7 * 24 * 3600 * 1000),
    monthAgo: new Date(now - 30 * 24 * 3600 * 1000),
  }
}

export default async function AdminDashboard() {
  await requireAdmin()
  const { today, weekAgo, monthAgo } = dashboardDates()
  const paidWhere = { paymentStatus: 'PAID' as const }

  const [
    salesToday,
    salesWeek,
    salesMonth,
    salesTotal,
    ordersToday,
    pendingOrders,
    unfulfilled,
    products,
    recentOrders,
    recentCustomers,
    bestSellers,
    productsWithoutCoa,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { ...paidWhere, paidAt: { gte: today } }, _sum: { totalCents: true } }),
    prisma.order.aggregate({ where: { ...paidWhere, paidAt: { gte: weekAgo } }, _sum: { totalCents: true } }),
    prisma.order.aggregate({ where: { ...paidWhere, paidAt: { gte: monthAgo } }, _sum: { totalCents: true } }),
    prisma.order.aggregate({ where: paidWhere, _sum: { totalCents: true }, _count: true }),
    prisma.order.count({ where: { createdAt: { gte: today }, status: { not: 'PENDING' } } }),
    prisma.order.count({ where: { status: 'PAYMENT_PROCESSING' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, vialSize: true, inventoryQty: true, lowStockThreshold: true } }),
    prisma.order.findMany({
      where: { status: { not: 'PENDING' } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, orderNumber: true, totalCents: true, status: true, customerEmail: true, createdAt: true },
    }),
    prisma.user.findMany({ where: { role: 'CUSTOMER' }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, email: true, createdAt: true, emailVerified: true } }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName', 'vialSize'],
      where: { order: paidWhere },
      _sum: { quantity: true, lineTotalCents: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.product.count({ where: { active: true, coas: { none: { isCurrent: true, active: true } } } }),
  ])

  const lowStock = products.filter((p) => p.inventoryQty > 0 && p.inventoryQty <= p.lowStockThreshold)
  const soldOut = products.filter((p) => p.inventoryQty <= 0)

  const cards = [
    { label: 'Sales today', value: formatCents(salesToday._sum.totalCents ?? 0) },
    { label: 'Sales · 7 days', value: formatCents(salesWeek._sum.totalCents ?? 0) },
    { label: 'Sales · 30 days', value: formatCents(salesMonth._sum.totalCents ?? 0) },
    { label: 'Total sales', value: formatCents(salesTotal._sum.totalCents ?? 0) },
    { label: 'Orders today', value: String(ordersToday) },
    { label: 'Payment processing', value: String(pendingOrders) },
    { label: 'To fulfill', value: String(unfulfilled), href: '/admin/orders?status=PAID' },
    { label: 'Paid orders (all time)', value: String(salesTotal._count) },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-4">
            <p className="microlabel">{c.label}</p>
            <p className="mt-2 text-xl font-bold">
              {c.href ? <Link href={c.href} className="hover:text-gold">{c.value}</Link> : c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-4">
          <p className="microlabel text-gold">Inventory attention</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">Low stock</span>
              <Link href="/admin/inventory?filter=low" className="font-bold hover:text-gold">{lowStock.length}</Link>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Sold out</span>
              <Link href="/admin/inventory?filter=out" className="font-bold hover:text-gold">{soldOut.length}</Link>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Products missing a current COA</span>
              <Link href="/admin/coas" className="font-bold hover:text-gold">{productsWithoutCoa}</Link>
            </li>
          </ul>
        </div>

        <div className="panel p-4 lg:col-span-2">
          <p className="microlabel text-gold">Best sellers (paid orders)</p>
          {bestSellers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No paid orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {bestSellers.map((b) => (
                <li key={b.productId} className="flex justify-between gap-3">
                  <span className="truncate text-muted">
                    {b.productName} — {b.vialSize}
                  </span>
                  <span className="shrink-0">
                    {b._sum.quantity} units · {formatCents(b._sum.lineTotalCents ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="microlabel">Recent orders</p>
            <Link href="/admin/orders" className="text-xs text-gold uppercase">All orders</Link>
          </div>
          <ul className="divide-y divide-line/50 text-sm">
            {recentOrders.length === 0 && <li className="px-4 py-6 text-center text-muted">No orders yet.</li>}
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-panel-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{o.orderNumber}</span>
                    <span className="block truncate text-xs text-muted">{o.customerEmail}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold">{formatCents(o.totalCents)}</span>
                    <span className="block text-xs text-muted">{o.status.replaceAll('_', ' ')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="microlabel">Recent customers</p>
            <Link href="/admin/customers" className="text-xs text-gold uppercase">All customers</Link>
          </div>
          <ul className="divide-y divide-line/50 text-sm">
            {recentCustomers.length === 0 && <li className="px-4 py-6 text-center text-muted">No customers yet.</li>}
            {recentCustomers.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate">{c.email}</span>
                <span className="shrink-0 text-xs text-muted">
                  {c.emailVerified ? 'verified' : 'unverified'} · {c.createdAt.toLocaleDateString('en-US')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
