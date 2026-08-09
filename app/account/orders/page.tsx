import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'

export const metadata: Metadata = { title: 'Order History', robots: { index: false, follow: false } }

const STATUS_BADGE: Record<string, string> = {
  PAID: 'badge badge-gold',
  PROCESSING: 'badge badge-gold',
  SHIPPED: 'badge badge-instock',
  FULFILLED: 'badge badge-instock',
  CANCELLED: 'badge badge-neutral',
  REFUNDED: 'badge badge-neutral',
  PENDING: 'badge badge-neutral',
  PAYMENT_PROCESSING: 'badge badge-neutral',
}

export default async function OrderHistoryPage() {
  const user = await requireUser()
  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { not: 'PENDING' } },
    orderBy: { createdAt: 'desc' },
    include: { items: { select: { quantity: true } } },
    take: 100,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/account" className="hover:text-fg">
          Account
        </Link>
        <span className="mx-2">/</span>
        Orders
      </nav>
      <h1 className="gold-keyline mt-3 text-3xl font-bold tracking-tight">Order history</h1>

      {orders.length === 0 ? (
        <p className="panel mt-8 px-5 py-12 text-center text-sm text-muted">
          No orders yet.{' '}
          <Link href="/catalog" className="text-gold">
            Browse the catalog
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 space-y-2.5">
          {orders.map((o) => {
            const units = o.items.reduce((s, i) => s + i.quantity, 0)
            return (
              <li key={o.id}>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="panel flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-line-strong"
                >
                  <span>
                    <span className="text-sm font-semibold">{o.orderNumber}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {o.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}{' '}
                      · {units} unit{units === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className={STATUS_BADGE[o.status] ?? 'badge badge-neutral'}>
                      {o.status.replaceAll('_', ' ')}
                    </span>
                    <span className="text-sm font-bold">{formatCents(o.totalCents)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
