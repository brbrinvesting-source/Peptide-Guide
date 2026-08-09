import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'

export const metadata: Metadata = { title: 'Order Details', robots: { index: false, follow: false } }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, shippingAddress: true, billingAddress: true },
  })
  if (!order || order.userId !== user.id) notFound()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/account" className="hover:text-fg">
          Account
        </Link>
        <span className="mx-2">/</span>
        <Link href="/account/orders" className="hover:text-fg">
          Orders
        </Link>
        <span className="mx-2">/</span>
        {order.orderNumber}
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
        <span className="badge badge-gold">{order.status.replaceAll('_', ' ')}</span>
      </div>
      <p className="mt-2 text-xs text-muted">
        Placed {order.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {order.trackingNumber && (
        <div className="panel mt-6 border-gold/40 p-4 text-sm">
          <p className="microlabel text-gold">Tracking</p>
          <p className="mt-1.5 font-mono">
            {order.trackingCarrier ? `${order.trackingCarrier} · ` : ''}
            {order.trackingNumber}
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <section aria-labelledby="items-heading" className="panel overflow-hidden">
          <h2 id="items-heading" className="microlabel border-b border-line px-5 py-3">
            Items
          </h2>
          <ul className="divide-y divide-line/50">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <span>
                  <span className="font-semibold">{i.productName}</span>
                  <span className="block text-xs text-muted">
                    {i.vialSize} · SKU {i.sku} · ×{i.quantity}
                    {i.bulkDiscountPct > 0 && (
                      <span className="text-gold"> · bulk −{i.bulkDiscountPct}%</span>
                    )}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{formatCents(i.lineTotalCents)}</span>
                  <span className="block text-xs text-muted">{formatCents(i.effectiveUnitCents)}/unit</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="microlabel">Totals</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatCents(order.subtotalCents)}</dd>
              </div>
              {order.bulkDiscountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Bulk discount</dt>
                  <dd className="text-gold">−{formatCents(order.bulkDiscountCents)}</dd>
                </div>
              )}
              {order.promoDiscountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Promo {order.promoCodeText && `(${order.promoCodeText})`}</dt>
                  <dd className="text-gold">−{formatCents(order.promoDiscountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping {order.shippingMethodName && `(${order.shippingMethodName})`}</dt>
                <dd>{order.shippingCents === 0 ? 'FREE' : formatCents(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd>{formatCents(order.taxCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 font-bold">
                <dt>Total</dt>
                <dd>{formatCents(order.totalCents)}</dd>
              </div>
            </dl>
          </div>

          {order.shippingAddress && (
            <div className="panel p-5 text-sm">
              <h2 className="microlabel">Shipping address</h2>
              <address className="mt-3 leading-relaxed text-muted not-italic">
                {order.shippingAddress.name}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && (
                  <>
                    <br />
                    {order.shippingAddress.line2}
                  </>
                )}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </address>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
