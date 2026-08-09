import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'
import { deletePromoAction } from '@/app/actions/admin'
import { PromoForm } from './PromoForm'

export default async function AdminPromosPage() {
  await requireAdmin()
  const promos = await prisma.promoCode.findMany({
    where: { isWelcomeCode: false },
    include: {
      redemptions: { select: { discountCents: true, order: { select: { totalCents: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Promo codes</h1>
      <p className="mt-2 text-xs text-muted">
        One promo code per order (enforced server-side). Bulk discounts stack with a promo code;
        promo codes never stack with each other. Welcome codes are managed on the{' '}
        <a href="/admin/welcome-promos" className="text-gold">Welcome Promos</a> page.
      </p>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Window</th>
                <th>Uses</th>
                <th>Revenue</th>
                <th>Given</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => {
                const uses = p.redemptions.length
                const revenue = p.redemptions.reduce((s, r) => s + r.order.totalCents, 0)
                const given = p.redemptions.reduce((s, r) => s + r.discountCents, 0)
                return (
                  <tr key={p.id}>
                    <td>
                      <details>
                        <summary className="cursor-pointer font-mono font-semibold text-gold">{p.code}</summary>
                        <div className="max-w-sm py-3">
                          <PromoForm
                            promo={{
                              id: p.id,
                              code: p.code,
                              description: p.description ?? '',
                              discountType: p.discountType,
                              discountValue: p.discountType === 'FIXED' ? (p.discountValue / 100).toFixed(2) : String(p.discountValue),
                              startsAt: p.startsAt?.toISOString().slice(0, 10) ?? '',
                              expiresAt: p.expiresAt?.toISOString().slice(0, 10) ?? '',
                              minSubtotal: p.minSubtotalCents ? (p.minSubtotalCents / 100).toFixed(2) : '',
                              maxTotalUses: p.maxTotalUses?.toString() ?? '',
                              perCustomerLimit: p.perCustomerLimit?.toString() ?? '',
                              active: p.active,
                            }}
                          />
                        </div>
                      </details>
                    </td>
                    <td>{p.discountType === 'PERCENT' ? `${p.discountValue}%` : formatCents(p.discountValue)}</td>
                    <td className="text-xs text-muted">
                      {p.startsAt ? p.startsAt.toLocaleDateString('en-US') : '—'} → {p.expiresAt ? p.expiresAt.toLocaleDateString('en-US') : 'no expiry'}
                    </td>
                    <td>{uses}{p.maxTotalUses ? ` / ${p.maxTotalUses}` : ''}</td>
                    <td>{formatCents(revenue)}</td>
                    <td className="text-gold">{formatCents(given)}</td>
                    <td>{p.active ? <span className="badge badge-instock">Active</span> : <span className="badge badge-neutral">Off</span>}</td>
                    <td>
                      <form action={deletePromoAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs text-muted hover:text-danger" title={uses > 0 ? 'Has redemptions — will be deactivated' : 'Delete'}>
                          {uses > 0 ? 'Deactivate' : 'Delete'}
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {promos.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted">No promo codes yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel h-fit p-5">
          <p className="microlabel mb-4">Create promo code</p>
          <PromoForm promo={null} />
        </div>
      </div>
    </div>
  )
}
