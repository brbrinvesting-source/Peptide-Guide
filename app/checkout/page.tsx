import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { loadActiveCart, priceCart } from '@/lib/cart'
import { prisma } from '@/lib/db'
import { CHECKOUT_ACKNOWLEDGEMENT_TEXT } from '@/lib/constants'
import { CheckoutClient } from './CheckoutClient'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }

export default async function CheckoutPage() {
  const user = await requireUser()
  const cart = await loadActiveCart(user.id)
  if (!cart || cart.items.length === 0) redirect('/cart')
  const pricing = await priceCart(cart)
  if (pricing.lines.length === 0 || pricing.problems.length > 0) redirect('/cart')

  const shippingMethods = await prisma.shippingMethod.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
  if (shippingMethods.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Checkout unavailable</h1>
        <p className="mt-3 text-sm text-muted">
          No shipping methods are currently configured. Please contact support.
        </p>
      </div>
    )
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

  return (
    <CheckoutClient
      customer={{ email: user.email, name: [user.firstName, user.lastName].filter(Boolean).join(' ') }}
      lines={pricing.lines.map((l) => ({
        name: l.name,
        vialSize: l.vialSize,
        quantity: l.quantity,
        lineTotalCents: l.lineTotalCents,
      }))}
      totals={{
        subtotalCents: pricing.subtotalCents,
        bulkDiscountCents: pricing.bulkDiscountCents,
        promoDiscountCents: pricing.promoDiscountCents,
        merchandiseTotalCents: pricing.merchandiseTotalCents,
        freeShippingQualified: pricing.freeShippingQualified,
      }}
      promoCode={pricing.promo && !pricing.promo.error ? pricing.promo.code : null}
      shippingMethods={shippingMethods.map((m) => ({
        id: m.id,
        name: m.name,
        priceCents: m.priceCents,
        deliveryEstimate: m.deliveryEstimate,
        freeShippingEligible: m.freeShippingEligible,
        isLive: m.rateType === 'LIVE_CARRIER',
      }))}
      acknowledgementText={CHECKOUT_ACKNOWLEDGEMENT_TEXT}
      stripePublishableKey={publishableKey}
    />
  )
}
