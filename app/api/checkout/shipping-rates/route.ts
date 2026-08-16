import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { loadActiveCart, priceCart, resolveShippingCents } from '@/lib/cart'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { US_STATES } from '@/lib/constants'

// Live-rate preview for checkout: quotes LIVE_CARRIER shipping methods for
// the customer's cart + address before they submit payment. The final
// authoritative price is always recalculated again server-side at order
// creation — this endpoint is preview-only, never trusted for the charge.

const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(100),
  state: z.string().refine((s) => s in US_STATES, 'Select a valid U.S. state'),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

const bodySchema = z.object({ shipping: addressSchema })

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!rateLimit(`shipping-rates:${user.id}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 })
  }

  let parsed
  try {
    parsed = bodySchema.safeParse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please complete a valid shipping address.' }, { status: 400 })
  }
  const shipping = parsed.data.shipping

  const cart = await loadActiveCart(user.id)
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }
  const pricing = await priceCart(cart)
  if (pricing.problems.length > 0) {
    return NextResponse.json({ error: 'Some items in your cart are no longer available.' }, { status: 400 })
  }

  const liveMethods = await prisma.shippingMethod.findMany({
    where: { active: true, rateType: 'LIVE_CARRIER' },
  })

  const rates: Record<string, { cents: number } | { error: string }> = {}
  for (const method of liveMethods) {
    const result = await resolveShippingCents(method.id, pricing.merchandiseTotalCents, {
      destination: { ...shipping, line2: shipping.line2 || undefined, phone: shipping.phone || undefined },
      cart,
    })
    rates[method.id] = result.ok ? { cents: result.cents } : { error: result.error }
  }

  return NextResponse.json({ rates })
}
