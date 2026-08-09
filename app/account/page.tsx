import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logoutAction } from '@/app/actions/auth'
import { formatCents } from '@/lib/constants'
import { AccountForms } from './AccountForms'

export const metadata: Metadata = { title: 'Account', robots: { index: false, follow: false } }

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PAYMENT_PROCESSING: 'Payment processing',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

export default async function AccountPage() {
  const user = await requireUser()
  const [recentOrders, welcome] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id, status: { not: 'PENDING' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.welcomePromotion.findUnique({
      where: { userId: user.id },
      include: { promoCode: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="gold-keyline">
          <p className="microlabel">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-ghost btn-sm">
            Log out
          </button>
        </form>
      </div>

      {welcome && !welcome.redeemedAt && welcome.promoCode.active && (
        <div className="panel mt-8 border-gold/50 p-5">
          <p className="microlabel text-gold">Your first-order discount</p>
          <p className="mt-2 text-sm text-muted">
            {welcome.discountPercent}% off your first order — one-time use, linked to your account.
          </p>
          <p className="mt-2 font-mono text-lg tracking-[0.14em] text-gold">{welcome.promoCode.code}</p>
        </div>
      )}

      <section className="mt-8" aria-labelledby="orders-heading">
        <div className="flex items-center justify-between">
          <h2 id="orders-heading" className="microlabel">
            Recent orders
          </h2>
          <Link href="/account/orders" className="text-xs tracking-wide text-gold uppercase hover:text-gold-bright">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="panel mt-3 px-5 py-8 text-center text-sm text-muted">
            No orders yet.{' '}
            <Link href="/catalog" className="text-gold">
              Browse the catalog
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="panel flex items-center justify-between gap-4 p-4 transition-colors hover:border-line-strong"
                >
                  <span>
                    <span className="block text-sm font-semibold">{o.orderNumber}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {o.createdAt.toLocaleDateString('en-US')} · {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{formatCents(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AccountForms
        email={user.email}
        firstName={user.firstName ?? ''}
        lastName={user.lastName ?? ''}
        marketingOptOut={user.marketingOptOut}
      />
    </div>
  )
}
