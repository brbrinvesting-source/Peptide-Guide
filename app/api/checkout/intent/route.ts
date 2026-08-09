import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { loadActiveCart } from '@/lib/cart'
import { createPendingOrder } from '@/lib/orders'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { US_STATES } from '@/lib/constants'

const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(100),
  state: z.string().refine((s) => s in US_STATES, 'Select a valid U.S. state'),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

const bodySchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  shipping: addressSchema,
  billingSameAsShipping: z.boolean(),
  billing: addressSchema.nullable().optional(),
  shippingMethodId: z.string().min(1),
  acceptedDisclaimer: z.literal(true),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!rateLimit(`checkout:${user.id}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a few minutes.' },
      { status: 429 }
    )
  }

  let parsed
  try {
    parsed = bodySchema.safeParse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { error: issue?.message === 'Required' ? 'Please complete all required fields.' : issue?.message ?? 'Invalid input.' },
      { status: 400 }
    )
  }
  const body = parsed.data

  const cart = await loadActiveCart(user.id)
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }

  // Abandon any earlier unpaid pending orders from this user (e.g. the user
  // went back and changed their address). Confirmed/processing payments are
  // never touched.
  await prisma.order.updateMany({
    where: { userId: user.id, status: 'PENDING', paymentStatus: 'PENDING' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })

  const result = await createPendingOrder({
    userId: user.id,
    userEmail: user.email,
    customerName: body.customerName,
    shipping: { ...body.shipping, line2: body.shipping.line2 || undefined, phone: body.shipping.phone || undefined },
    billing:
      body.billingSameAsShipping || !body.billing
        ? null
        : { ...body.billing, line2: body.billing.line2 || undefined, phone: body.billing.phone || undefined },
    shippingMethodId: body.shippingMethodId,
    acceptedDisclaimer: body.acceptedDisclaimer,
    cart,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  const order = await prisma.order.findUnique({
    where: { id: result.orderId },
    select: {
      subtotalCents: true,
      bulkDiscountCents: true,
      promoDiscountCents: true,
      shippingCents: true,
      taxCents: true,
      totalCents: true,
    },
  })

  return NextResponse.json({
    clientSecret: result.clientSecret,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    totals: order,
  })
}
