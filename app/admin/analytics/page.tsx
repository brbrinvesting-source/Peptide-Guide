import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'

export default async function AdminAnalyticsPage() {
  await requireAdmin()
  const paidWhere = { paymentStatus: 'PAID' as const }

  const [
    orderAgg,
    unitAgg,
    discountAgg,
    customerCount,
    verifiedCount,
    products,
    bestByRevenue,
    promoAgg,
    welcomeAgg,
    coaProducts,
    totalActiveProducts,
    recentCoas,
  ] = await Promise.all([
    prisma.order.aggregate({ where: paidWhere, _sum: { totalCents: true }, _count: true, _avg: { totalCents: true } }),
    prisma.orderItem.aggregate({ where: { order: paidWhere }, _sum: { quantity: true } }),
    prisma.order.aggregate({ where: paidWhere, _sum: { bulkDiscountCents: true, promoDiscountCents: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', emailVerified: true } }),
    prisma.product.findMany({ where: { active: true }, select: { inventoryQty: true, lowStockThreshold: true } }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName', 'vialSize'],
      where: { order: paidWhere },
      _sum: { quantity: true, lineTotalCents: true },
      orderBy: { _sum: { lineTotalCents: 'desc' } },
      take: 10,
    }),
    prisma.promoRedemption.aggregate({ _sum: { discountCents: true }, _count: true }),
    prisma.welcomePromotion.aggregate({ where: { redeemedAt: { not: null } }, _sum: { discountCents: true }, _count: true }),
    prisma.product.count({ where: { active: true, coas: { some: { isCurrent: true, active: true } } } }),
    prisma.product.count({ where: { active: true } }),
    prisma.coa.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { product: true } }),
  ])

  const soldOut = products.filter((p) => p.inventoryQty <= 0).length
  const lowStock = products.filter((p) => p.inventoryQty > 0 && p.inventoryQty <= p.lowStockThreshold).length
  const totalUnits = products.reduce((s, p) => s + Math.max(p.inventoryQty, 0), 0)

  const cards = [
    { label: 'Revenue (paid)', value: formatCents(orderAgg._sum.totalCents ?? 0) },
    { label: 'Paid orders', value: String(orderAgg._count) },
    { label: 'Average order value', value: formatCents(Math.round(orderAgg._avg.totalCents ?? 0)) },
    { label: 'Units sold', value: String(unitAgg._sum.quantity ?? 0) },
    { label: 'Bulk discounts given', value: formatCents(discountAgg._sum.bulkDiscountCents ?? 0) },
    { label: 'Promo discounts given', value: formatCents(discountAgg._sum.promoDiscountCents ?? 0) },
    { label: 'Customers', value: `${customerCount} (${verifiedCount} verified)` },
    { label: 'Inventory on hand', value: `${totalUnits} units` },
    { label: 'Low stock / sold out', value: `${lowStock} / ${soldOut}` },
    { label: 'Promo redemptions', value: `${promoAgg._count} (${formatCents(promoAgg._sum.discountCents ?? 0)})` },
    { label: 'Welcome redemptions', value: `${welcomeAgg._count} (${formatCents(welcomeAgg._sum.discountCents ?? 0)})` },
    { label: 'Products with current COA', value: `${coaProducts} / ${totalActiveProducts}` },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-4">
            <p className="microlabel">{c.label}</p>
            <p className="mt-2 text-lg font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-x-auto">
          <p className="microlabel border-b border-line px-4 py-3">Top products by revenue (paid)</p>
          <table className="data-table">
            <thead>
              <tr><th>Product</th><th>Units</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {bestByRevenue.map((b) => (
                <tr key={b.productId}>
                  <td className="font-semibold">{b.productName} <span className="text-muted">— {b.vialSize}</span></td>
                  <td>{b._sum.quantity}</td>
                  <td>{formatCents(b._sum.lineTotalCents ?? 0)}</td>
                </tr>
              ))}
              {bestByRevenue.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted">No paid orders yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel overflow-hidden">
          <p className="microlabel border-b border-line px-4 py-3">Recent COA uploads</p>
          <ul className="divide-y divide-line/50 text-sm">
            {recentCoas.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 px-4 py-2.5">
                <span className="truncate">{c.product.name} — {c.product.vialSize}</span>
                <span className="shrink-0 text-xs text-muted">{c.createdAt.toLocaleDateString('en-US')}</span>
              </li>
            ))}
            {recentCoas.length === 0 && <li className="px-4 py-8 text-center text-muted">No COAs uploaded yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
