import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'
import { OrderAdminForms } from './OrderAdminForms'
import { formatDateTime } from '@/lib/dates'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { id: true, email: true } },
      payments: true,
      shippingAddress: true,
      billingAddress: true,
      disclaimerAcceptance: true,
      promoRedemption: { include: { promoCode: true } },
    },
  })
  if (!order) notFound()

  return (
    <div>
      <nav className="text-xs text-muted">
        <Link href="/admin/orders" className="hover:text-fg">Orders</Link>
        <span className="mx-2">/</span>{order.orderNumber}
      </nav>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
        <span className={`badge ${order.paymentStatus === 'PAID' ? 'badge-instock' : order.paymentStatus === 'FAILED' ? 'badge-danger' : 'badge-neutral'}`}>
          Payment: {order.paymentStatus.replaceAll('_', ' ')}
        </span>
        <span className="badge badge-gold">{order.status.replaceAll('_', ' ')}</span>
      </div>
      <p className="mt-2 text-xs text-muted">
        Placed {formatDateTime(order.createdAt)}
        {order.paidAt && ` · Paid ${formatDateTime(order.paidAt)}`}
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="panel overflow-hidden">
            <p className="microlabel border-b border-line px-4 py-3">Items</p>
            <table className="data-table">
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Bulk</th><th>Line</th></tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-semibold">{i.productName} <span className="text-muted">— {i.vialSize}</span></td>
                    <td className="font-mono text-xs">{i.sku}</td>
                    <td>{i.quantity}</td>
                    <td>{formatCents(i.effectiveUnitCents)}</td>
                    <td className="text-gold">{i.bulkDiscountPct > 0 ? `−${i.bulkDiscountPct}%` : '—'}</td>
                    <td className="font-semibold">{formatCents(i.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1.5 border-t border-line px-4 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
              {order.bulkDiscountCents > 0 && <div className="flex justify-between"><dt className="text-muted">Bulk discount</dt><dd className="text-gold">−{formatCents(order.bulkDiscountCents)}</dd></div>}
              {order.promoDiscountCents > 0 && <div className="flex justify-between"><dt className="text-muted">Promo ({order.promoCodeText})</dt><dd className="text-gold">−{formatCents(order.promoDiscountCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping ({order.shippingMethodName ?? '—'})</dt><dd>{formatCents(order.shippingCents)}</dd></div>
              {order.insuranceCents > 0 && <div className="flex justify-between"><dt className="text-muted">Shipping insurance</dt><dd>{formatCents(order.insuranceCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatCents(order.totalCents)}</dd></div>
            </dl>
          </section>

          <section className="panel p-4">
            <p className="microlabel">Payments</p>
            <ul className="mt-3 space-y-2 text-sm">
              {order.payments.length === 0 && <li className="text-muted">No payment intents recorded.</li>}
              {order.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted">{p.provider} · {p.providerPaymentId}</span>
                  <span>
                    {formatCents(p.amountCents)} —{' '}
                    <span className={p.status === 'PAID' ? 'text-success' : p.status === 'FAILED' ? 'text-danger' : 'text-muted'}>
                      {p.status.replaceAll('_', ' ')}
                    </span>
                    {p.refundedCents > 0 && <span className="text-muted"> · refunded {formatCents(p.refundedCents)}</span>}
                  </span>
                  {p.lastError && <span className="w-full text-xs text-danger">{p.lastError}</span>}
                </li>
              ))}
            </ul>
          </section>

          {order.disclaimerAcceptance && (
            <section className="panel p-4">
              <p className="microlabel text-gold">Research-use acknowledgement</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Accepted {formatDateTime(order.disclaimerAcceptance.acceptedAt)} · version{' '}
                {order.disclaimerAcceptance.disclaimerVersion}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-fg/80">
                &ldquo;{order.disclaimerAcceptance.disclaimerText}&rdquo;
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="panel p-4 text-sm">
            <p className="microlabel">Customer</p>
            <p className="mt-2 font-semibold">{order.customerName}</p>
            <Link href={`/admin/customers/${order.user.id}`} className="text-gold hover:text-gold-bright">
              {order.customerEmail}
            </Link>
            {order.shippingAddress && (
              <address className="mt-3 border-t border-line pt-3 leading-relaxed text-muted not-italic">
                {order.shippingAddress.name}<br />
                {order.shippingAddress.line1}{order.shippingAddress.line2 ? <><br />{order.shippingAddress.line2}</> : null}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                {order.shippingAddress.phone && <><br />{order.shippingAddress.phone}</>}
              </address>
            )}
            {order.billingAddress && (
              <p className="mt-2 text-xs text-muted">Separate billing address on file.</p>
            )}
          </section>

          <OrderAdminForms
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            trackingNumber={order.trackingNumber ?? ''}
            trackingCarrier={order.trackingCarrier ?? ''}
            adminNotes={order.adminNotes ?? ''}
          />
        </aside>
      </div>
    </div>
  )
}
