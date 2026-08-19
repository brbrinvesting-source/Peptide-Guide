import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { finalizeOrderPayment } from '@/lib/orders'
import { formatCents } from '@/lib/constants'

export const metadata: Metadata = { title: 'Order Status', robots: { index: false, follow: false } }

// The client is redirected here by Stripe after payment. The TRUE payment
// state is verified server-side (finalizeOrderPayment re-checks with the
// provider); the redirect itself is never trusted.

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_intent?: string }>
}) {
  const user = await requireUser()
  const { payment_intent: paymentIntentId } = await searchParams

  if (!paymentIntentId) {
    return <StatusShell title="Missing payment reference" body="We could not identify your payment. Check your order history or contact support." />
  }

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: paymentIntentId },
    include: { order: true },
  })
  if (!payment || payment.order.userId !== user.id) {
    return <StatusShell title="Order not found" body="We could not find this order on your account." />
  }

  // Server-side verification + idempotent finalization (webhook may have
  // already done this — both paths are safe).
  if (payment.status !== 'PAID') {
    await finalizeOrderPayment(paymentIntentId).catch((err) =>
      console.error('success-page finalization failed', err)
    )
  }

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    include: { items: true },
  })
  if (!order) {
    return <StatusShell title="Order not found" body="We could not find this order on your account." />
  }

  if (order.paymentStatus === 'PAID' || order.status === 'PAID') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="panel hex-texture p-8 text-center sm:p-12">
          <p className="microlabel text-gold">Payment confirmed</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Thank you</h1>
          <p className="mt-3 text-sm text-muted">
            Order <span className="font-semibold text-fg">{order.orderNumber}</span> is confirmed. A
            confirmation email is on its way to {order.customerEmail}.
          </p>
          <dl className="mx-auto mt-8 max-w-sm space-y-2 border-t border-line pt-5 text-left text-sm">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between gap-3">
                <dt className="text-muted">
                  {i.productName} ×{i.quantity}
                </dt>
                <dd>{formatCents(i.lineTotalCents)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-3 font-bold">
              <dt>Total</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
          {order.pointsEarned > 0 && (
            <p className="mx-auto mt-6 max-w-sm text-sm text-gold">
              You earned {order.pointsEarned.toLocaleString()} rewards points on this order.
            </p>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/account/orders/${order.id}`} className="btn btn-gold">
              View Order
            </Link>
            <Link href="/catalog" className="btn btn-outline">
              Continue Browsing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (order.paymentStatus === 'PROCESSING' || order.paymentStatus === 'PENDING') {
    return (
      <StatusShell
        title="Payment processing"
        body={`Your payment for order ${order.orderNumber} is still processing. You'll receive a confirmation email as soon as it completes — no need to pay again.`}
        orderId={order.id}
      />
    )
  }

  return (
    <StatusShell
      title="Payment not completed"
      body={`Payment for order ${order.orderNumber} did not complete. Your card was not charged, no inventory was taken, and any promo code remains available. You can return to your cart to try again.`}
      retry
    />
  )
}

function StatusShell({
  title,
  body,
  retry = false,
  orderId,
}: {
  title: string
  body: string
  retry?: boolean
  orderId?: string
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {retry && (
          <Link href="/cart" className="btn btn-gold">
            Return to Cart
          </Link>
        )}
        {orderId && (
          <Link href={`/account/orders/${orderId}`} className="btn btn-outline">
            View Order
          </Link>
        )}
        <Link href="/account/orders" className="btn btn-outline">
          Order History
        </Link>
      </div>
    </div>
  )
}
