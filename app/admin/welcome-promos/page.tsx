import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'
import { getSettings, SETTING_KEYS } from '@/lib/settings'

export default async function AdminWelcomePromosPage() {
  await requireAdmin()
  const [rows, settings] = await Promise.all([
    prisma.welcomePromotion.findMany({
      include: { user: { select: { email: true } }, promoCode: { select: { code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    getSettings([SETTING_KEYS.WELCOME_DISCOUNT_PERCENT, SETTING_KEYS.WELCOME_PROMO_ENABLED]),
  ])

  const redeemed = rows.filter((r) => r.redeemedAt)
  const totalDiscount = redeemed.reduce((s, r) => s + (r.discountCents ?? 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome promotions</h1>
      <p className="mt-2 text-xs text-muted">
        Each verified customer automatically receives a unique, account-linked, one-time
        first-order code. Current setting: {settings[SETTING_KEYS.WELCOME_PROMO_ENABLED] === 'true' ? `${settings[SETTING_KEYS.WELCOME_DISCOUNT_PERCENT]}% off, enabled` : 'disabled'}{' '}
        (change in <a href="/admin/settings" className="text-gold">Settings</a>).
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="panel p-4"><p className="microlabel">Issued</p><p className="mt-2 text-xl font-bold">{rows.length}</p></div>
        <div className="panel p-4"><p className="microlabel">Redeemed</p><p className="mt-2 text-xl font-bold">{redeemed.length}</p></div>
        <div className="panel p-4"><p className="microlabel">Total discount given</p><p className="mt-2 text-xl font-bold">{formatCents(totalDiscount)}</p></div>
      </div>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Code</th>
              <th>%</th>
              <th>Created</th>
              <th>Sent</th>
              <th>Redeemed</th>
              <th>Discount</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="max-w-52 truncate">{r.user.email}</td>
                <td className="font-mono text-xs text-gold">{r.promoCode.code}</td>
                <td>{r.discountPercent}%</td>
                <td className="text-xs text-muted">{r.createdAt.toLocaleDateString('en-US')}</td>
                <td className="text-xs text-muted">{r.sentAt ? r.sentAt.toLocaleDateString('en-US') : '—'}</td>
                <td className="text-xs">{r.redeemedAt ? <span className="text-success">{r.redeemedAt.toLocaleDateString('en-US')}</span> : <span className="text-muted">not yet</span>}</td>
                <td>{r.discountCents ? formatCents(r.discountCents) : '—'}</td>
                <td className="text-xs">
                  {r.redeemedOrderId ? <a href={`/admin/orders/${r.redeemedOrderId}`} className="text-gold">view</a> : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted">No welcome promotions issued yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
