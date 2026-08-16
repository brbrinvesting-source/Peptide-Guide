import 'server-only'
import { prisma } from './db'
import { priceCart, resolveShippingCents, type LoadedCart } from './cart'
import { calculateTax } from './tax'
import { getPaymentProvider } from './payments/provider'
import { getSetting, getInsuranceCents, SETTING_KEYS } from './settings'
import { sendEmail } from './email/provider'
import {
  adminNotificationEmail,
  orderConfirmationEmail,
} from './email/templates'
import { absoluteUrl } from './site'
import { CHECKOUT_ACKNOWLEDGEMENT_TEXT, formatCents } from './constants'
import { randomBytes } from 'crypto'

export interface CheckoutAddressInput {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  phone?: string
}

function generateOrderNumber(): string {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `AAP-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`
}

/**
 * Create a PENDING order from the user's cart plus a payment intent.
 * Everything (prices, discounts, shipping, tax) is recomputed server-side.
 * Inventory is NOT decremented here — only on confirmed payment.
 */
export async function createPendingOrder(params: {
  userId: string
  userEmail: string
  customerName: string
  shipping: CheckoutAddressInput
  billing: CheckoutAddressInput | null
  shippingMethodId: string
  insuranceElected: boolean
  acceptedDisclaimer: boolean
  cart: LoadedCart
}): Promise<
  | { ok: true; orderId: string; orderNumber: string; clientSecret: string; totalCents: number }
  | { ok: false; error: string }
> {
  if (!params.acceptedDisclaimer) {
    return { ok: false, error: 'You must accept the research-use acknowledgement to continue.' }
  }
  const pricing = await priceCart(params.cart)
  if (pricing.lines.length === 0) return { ok: false, error: 'Your cart is empty.' }
  if (pricing.problems.length > 0) {
    return {
      ok: false,
      error:
        'Some items in your cart are no longer available in the requested quantity. Please review your cart.',
    }
  }
  if (pricing.promo?.error) {
    return { ok: false, error: `Promo code issue: ${pricing.promo.error}` }
  }

  const ship = await resolveShippingCents(params.shippingMethodId, pricing.merchandiseTotalCents, {
    destination: params.shipping,
    cart: params.cart,
  })
  if (!ship.ok) return { ok: false, error: ship.error }

  // Insurance is priced on merchandise subtotal only, untaxed. Recalculated
  // here regardless of what the client displayed as a preview.
  const insuranceCents = params.insuranceElected
    ? ((await getInsuranceCents(pricing.merchandiseTotalCents)) ?? 0)
    : 0

  let taxCents: number
  try {
    const tax = await calculateTax({
      merchandiseTotalCents: pricing.merchandiseTotalCents,
      shippingCents: ship.cents,
      destination: params.shipping,
    })
    taxCents = tax.taxCents
  } catch (err) {
    console.error('tax calculation failed', err)
    return {
      ok: false,
      error: 'We could not calculate tax for this address. Please verify the address and try again.',
    }
  }

  const totalCents = pricing.merchandiseTotalCents + ship.cents + insuranceCents + taxCents
  if (totalCents < 50) return { ok: false, error: 'Order total is below the payment minimum.' }

  const disclaimerVersion = await getSetting(SETTING_KEYS.DISCLAIMER_VERSION)
  const orderNumber = generateOrderNumber()

  const order = await prisma.$transaction(async (tx) => {
    const shippingAddress = await tx.address.create({
      data: { ...params.shipping, userId: params.userId, country: 'US' },
    })
    const billingAddress = params.billing
      ? await tx.address.create({ data: { ...params.billing, userId: params.userId, country: 'US' } })
      : null

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: params.userId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotalCents: pricing.subtotalCents,
        bulkDiscountCents: pricing.bulkDiscountCents,
        promoDiscountCents: pricing.promoDiscountCents,
        shippingCents: ship.cents,
        insuranceCents,
        taxCents,
        totalCents,
        promoCodeId: params.cart.promoCodeId,
        promoCodeText: params.cart.promoCode?.code ?? null,
        shippingMethodId: params.shippingMethodId,
        shippingMethodName: ship.methodName,
        customerName: params.customerName,
        customerEmail: params.userEmail,
        shippingAddressId: shippingAddress.id,
        billingAddressId: billingAddress?.id ?? null,
        items: {
          create: pricing.lines.map((l) => ({
            productId: l.productId,
            productName: l.name,
            sku: l.sku,
            vialSize: l.vialSize,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            bulkDiscountPct: l.bulkDiscountPct,
            effectiveUnitCents: l.effectiveUnitCents,
            lineTotalCents: l.lineTotalCents,
          })),
        },
      },
    })

    await tx.disclaimerAcceptance.create({
      data: {
        userId: params.userId,
        orderId: created.id,
        disclaimerVersion,
        disclaimerText: CHECKOUT_ACKNOWLEDGEMENT_TEXT,
      },
    })
    return created
  })

  try {
    const intent = await getPaymentProvider().createPaymentIntent({
      amountCents: totalCents,
      currency: 'usd',
      orderId: order.id,
      orderNumber,
      customerEmail: params.userEmail,
    })
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: getPaymentProvider().name,
        providerPaymentId: intent.providerPaymentId,
        status: 'PENDING',
        amountCents: totalCents,
      },
    })
    return {
      ok: true,
      orderId: order.id,
      orderNumber,
      clientSecret: intent.clientSecret,
      totalCents,
    }
  } catch (err) {
    console.error('payment intent creation failed', err)
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })
    return { ok: false, error: 'Payment could not be initialized. Please try again.' }
  }
}

/**
 * Finalize an order after CONFIRMED payment (webhook or server-side verify).
 * Idempotent and transactional:
 *   - marks order paid exactly once
 *   - atomically decrements inventory (guards against overselling)
 *   - records promo/welcome redemption
 *   - converts the cart
 * Returns true if this call performed the finalization.
 */
export async function finalizeOrderPayment(providerPaymentId: string): Promise<boolean> {
  // Verify with the provider — never trust the caller.
  const verified = await getPaymentProvider().verifyPayment(providerPaymentId)
  if (verified.status !== 'PAID') return false

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId },
    include: { order: { include: { items: true } } },
  })
  if (!payment) {
    console.error(`webhook: no payment record for ${providerPaymentId}`)
    return false
  }
  if (verified.amountCents !== payment.amountCents) {
    console.error(
      `payment amount mismatch for order ${payment.order.orderNumber}: expected ${payment.amountCents}, got ${verified.amountCents}`
    )
    return false
  }

  let finalized = false
  await prisma.$transaction(async (tx) => {
    // Claim the finalization — exactly one caller wins.
    const claimed = await tx.order.updateMany({
      where: { id: payment.orderId, paymentStatus: { in: ['PENDING', 'PROCESSING'] } },
      data: { paymentStatus: 'PAID', status: 'PAID', paidAt: new Date() },
    })
    if (claimed.count === 0) return // already finalized (or refunded) elsewhere

    await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } })

    // Atomic inventory decrement with oversell guard.
    for (const item of payment.order.items) {
      const res = await tx.product.updateMany({
        where: { id: item.productId, inventoryQty: { gte: item.quantity } },
        data: { inventoryQty: { decrement: item.quantity } },
      })
      if (res.count === 0) {
        // Paid but stock ran out between checkout and payment confirmation.
        // Do not fail the transaction: record the oversell for admin action.
        console.error(
          `OVERSELL on order ${payment.order.orderNumber}: product ${item.sku} short by up to ${item.quantity}`
        )
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        const prev = product?.inventoryQty ?? 0
        await tx.product.update({ where: { id: item.productId }, data: { inventoryQty: 0 } })
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            previousQty: prev,
            newQty: 0,
            delta: -prev,
            reason: 'SALE',
            note: `Order ${payment.order.orderNumber} — OVERSOLD (requested ${item.quantity}); manual resolution required`,
            orderId: payment.orderId,
          },
        })
        continue
      }
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          previousQty: (product?.inventoryQty ?? 0) + item.quantity,
          newQty: product?.inventoryQty ?? 0,
          delta: -item.quantity,
          reason: 'SALE',
          note: `Order ${payment.order.orderNumber}`,
          orderId: payment.orderId,
        },
      })
    }

    // Finalize promo usage.
    if (payment.order.promoCodeId && payment.order.promoDiscountCents > 0) {
      await tx.promoRedemption.create({
        data: {
          promoCodeId: payment.order.promoCodeId,
          userId: payment.order.userId,
          orderId: payment.orderId,
          discountCents: payment.order.promoDiscountCents,
        },
      })
      const welcome = await tx.welcomePromotion.findUnique({
        where: { userId: payment.order.userId },
      })
      if (welcome && welcome.promoCodeId === payment.order.promoCodeId && !welcome.redeemedAt) {
        // Shared welcome code: only this customer's record is marked redeemed —
        // the code itself stays active for other customers (perCustomerLimit
        // already blocks this same account from reusing it).
        await tx.welcomePromotion.update({
          where: { id: welcome.id },
          data: {
            redeemedAt: new Date(),
            redeemedOrderId: payment.orderId,
            discountCents: payment.order.promoDiscountCents,
          },
        })
      }
    }

    // Convert the cart so it can't trigger abandoned-cart emails.
    await tx.cart.updateMany({
      where: { userId: payment.order.userId, status: { in: ['ACTIVE', 'ABANDONED_NOTIFIED'] } },
      data: { status: 'CONVERTED' },
    })
    finalized = true
  })

  if (!finalized) return false

  // Post-finalization side effects (never block payment finalization on email).
  await sendOrderPaidNotifications(payment.orderId).catch((err) =>
    console.error('order notification emails failed', err)
  )
  return true
}

async function sendOrderPaidNotifications(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) return

  const orderUrl = absoluteUrl(`/account/orders/${order.id}`)
  const confirmation = orderConfirmationEmail({
    orderNumber: order.orderNumber,
    lines: order.items.map((i) => ({
      name: i.productName,
      vialSize: i.vialSize,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
    })),
    subtotalCents: order.subtotalCents,
    bulkDiscountCents: order.bulkDiscountCents,
    promoDiscountCents: order.promoDiscountCents,
    shippingCents: order.shippingCents,
    insuranceCents: order.insuranceCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    orderUrl,
  })
  await sendEmail('ORDER_CONFIRMATION', { to: order.customerEmail, ...confirmation }, { orderId })

  const adminEmail = await getSetting(SETTING_KEYS.ADMIN_NOTIFICATION_EMAIL)
  if (adminEmail) {
    const note = adminNotificationEmail({
      title: `New order ${order.orderNumber}`,
      bodyText: `Total: ${formatCents(order.totalCents)}\nItems: ${order.items
        .map((i) => `${i.productName} ×${i.quantity}`)
        .join(', ')}\nCustomer: ${order.customerEmail}`,
      url: absoluteUrl(`/admin/orders/${order.id}`),
    })
    await sendEmail('ADMIN_NEW_ORDER', { to: adminEmail, ...note }, { orderId })
  }

  // Low-stock alerts after the sale.
  const productIds = order.items.map((i) => i.productId)
  const lowProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  })
  const nowLow = lowProducts.filter((p) => p.inventoryQty <= p.lowStockThreshold)
  if (adminEmail && nowLow.length > 0) {
    const note = adminNotificationEmail({
      title: `Low inventory alert`,
      bodyText: nowLow
        .map((p) => `${p.name} (${p.sku}): ${p.inventoryQty} remaining (threshold ${p.lowStockThreshold})`)
        .join('\n'),
      url: absoluteUrl('/admin/inventory'),
    })
    await sendEmail('ADMIN_LOW_STOCK', { to: adminEmail, ...note }, { orderId })
  }
}

/** Record a failed payment. Inventory/promo were never consumed for PENDING orders. */
export async function markPaymentFailed(
  providerPaymentId: string,
  errorMessage: string
): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId },
    include: { order: true },
  })
  if (!payment) return
  if (payment.status === 'PAID') return // never downgrade a confirmed payment
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', lastError: errorMessage.slice(0, 500) },
  })
  await prisma.order.updateMany({
    where: { id: payment.orderId, paymentStatus: { in: ['PENDING', 'PROCESSING'] } },
    data: { paymentStatus: 'FAILED' },
  })
  const adminEmail = await getSetting(SETTING_KEYS.ADMIN_NOTIFICATION_EMAIL)
  if (adminEmail) {
    const note = adminNotificationEmail({
      title: `Payment failed — order ${payment.order.orderNumber}`,
      bodyText: `Amount: ${formatCents(payment.amountCents)}\nError: ${errorMessage}`,
      url: absoluteUrl(`/admin/orders/${payment.orderId}`),
    })
    await sendEmail('ADMIN_PAYMENT_ISSUE', { to: adminEmail, ...note }, { orderId: payment.orderId })
  }
}

export async function markPaymentProcessing(providerPaymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId } })
  if (!payment || payment.status !== 'PENDING') return
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PROCESSING' } })
  await prisma.order.updateMany({
    where: { id: payment.orderId, paymentStatus: 'PENDING' },
    data: { paymentStatus: 'PROCESSING', status: 'PAYMENT_PROCESSING' },
  })
}

export async function recordRefund(providerPaymentId: string, refundedCents: number): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId } })
  if (!payment) return
  const full = refundedCents >= payment.amountCents
  await prisma.payment.update({
    where: { id: payment.id },
    data: { refundedCents, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
  })
  await prisma.order.update({
    where: { id: payment.orderId },
    data: full
      ? { paymentStatus: 'REFUNDED', status: 'REFUNDED' }
      : { paymentStatus: 'PARTIALLY_REFUNDED' },
  })
}
