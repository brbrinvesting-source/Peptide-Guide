import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'
import { setCustomerDisabledAction } from '@/app/actions/admin'
import { formatDate } from '@/lib/dates'
import { PointsAdjustForm } from './PointsAdjustForm'

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: { where: { status: { not: 'PENDING' } }, orderBy: { createdAt: 'desc' }, take: 50 },
      welcomePromotion: { include: { promoCode: true } },
      referredBy: { select: { email: true } },
      referrals: { select: { id: true, email: true, createdAt: true } },
    },
  })
  if (!customer || customer.role !== 'CUSTOMER') notFound()

  const referralBonus = await prisma.pointsTransaction.aggregate({
    where: { userId: customer.id, type: 'REFERRAL_BONUS' },
    _sum: { points: true },
  })

  const paidOrders = customer.orders.filter((o) => o.paymentStatus === 'PAID')
  const totalSpend = paidOrders.reduce((s, o) => s + o.totalCents, 0)

  return (
    <div>
      <nav className="text-xs text-muted">
        <Link href="/admin/customers" className="hover:text-fg">Customers</Link>
        <span className="mx-2">/</span>{customer.email}
      </nav>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{customer.email}</h1>
        <form action={setCustomerDisabledAction}>
          <input type="hidden" name="userId" value={customer.id} />
          <input type="hidden" name="disabled" value={customer.disabled ? 'false' : 'true'} />
          <button type="submit" className={customer.disabled ? 'btn btn-outline btn-sm' : 'btn btn-danger btn-sm'}>
            {customer.disabled ? 'Re-enable Account' : 'Disable Account'}
          </button>
        </form>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="panel p-4"><p className="microlabel">Joined</p><p className="mt-2 font-bold">{formatDate(customer.createdAt)}</p></div>
        <div className="panel p-4"><p className="microlabel">Email verified</p><p className="mt-2 font-bold">{customer.emailVerified ? 'Yes' : 'No'}</p></div>
        <div className="panel p-4"><p className="microlabel">Paid orders</p><p className="mt-2 font-bold">{paidOrders.length}</p></div>
        <div className="panel p-4"><p className="microlabel">Total spend</p><p className="mt-2 font-bold">{formatCents(totalSpend)}</p></div>
      </div>

      {customer.welcomePromotion && (
        <div className="panel mt-4 p-4 text-sm">
          <p className="microlabel text-gold">Welcome promotion</p>
          <p className="mt-2 text-muted">
            Code <span className="font-mono text-gold">{customer.welcomePromotion.promoCode.code}</span> ·{' '}
            {customer.welcomePromotion.discountPercent}% ·{' '}
            {customer.welcomePromotion.redeemedAt
              ? `redeemed ${formatDate(customer.welcomePromotion.redeemedAt)} (${formatCents(customer.welcomePromotion.discountCents ?? 0)} discount)`
              : 'not redeemed yet'}
          </p>
        </div>
      )}

      <div className="panel mt-4 p-4 text-sm">
        <p className="microlabel text-gold">Rewards &amp; referrals</p>
        <p className="mt-2 text-muted">
          Points balance <span className="font-bold text-fg">{customer.pointsBalance.toLocaleString()}</span> ·
          Referral code <span className="font-mono text-gold">{customer.referralCode}</span>
          {customer.referredBy && (
            <>
              {' '}
              · Referred by <span className="text-fg">{customer.referredBy.email}</span>
            </>
          )}
        </p>
        <p className="mt-1.5 text-muted">
          {customer.referrals.length} friend{customer.referrals.length === 1 ? '' : 's'} referred ·{' '}
          {(referralBonus._sum.points ?? 0).toLocaleString()} lifetime bonus points earned
        </p>
        <PointsAdjustForm userId={customer.id} />
      </div>

      <div className="panel mt-6 overflow-x-auto">
        <p className="microlabel border-b border-line px-4 py-3">Order history</p>
        <table className="data-table">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th></tr>
          </thead>
          <tbody>
            {customer.orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-gold">{o.orderNumber}</Link></td>
                <td className="text-xs text-muted">{formatDate(o.createdAt)}</td>
                <td className="text-xs">{o.status.replaceAll('_', ' ')}</td>
                <td className="text-xs">{o.paymentStatus.replaceAll('_', ' ')}</td>
                <td className="font-semibold">{formatCents(o.totalCents)}</td>
              </tr>
            ))}
            {customer.orders.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
