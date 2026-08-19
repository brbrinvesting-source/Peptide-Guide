import 'server-only'
import { prisma } from './db'
import {
  bulkPercentFor,
  getBulkTiers,
  getFreeShippingProgress,
  priceLine,
  promoDiscountCents,
  validatePromoCode,
  type CartPricing,
  type CartProblem,
  type PricedLine,
} from './pricing'
import type { Cart, CartItem, Product, ProductImage, PromoCode } from '@prisma/client'
import { getLiveShippingRateCents, type ShipAddress } from './shipping-rates'
import { getSetting, SETTING_KEYS } from './settings'
import { getRewardsConfig, isReferralFirstOrderEligible, pointsRedemptionValueCents } from './points'

export type LoadedCart = Cart & {
  items: (CartItem & {
    product: Product & { images: ProductImage[]; coas: { id: string }[] }
  })[]
  promoCode: PromoCode | null
}

export async function getOrCreateActiveCart(userId: string): Promise<LoadedCart> {
  const existing = await loadActiveCart(userId)
  if (existing) return existing
  await prisma.cart.create({ data: { userId } })
  return (await loadActiveCart(userId))!
}

export async function loadActiveCart(userId: string): Promise<LoadedCart | null> {
  return prisma.cart.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'ABANDONED_NOTIFIED'] } },
    orderBy: { updatedAt: 'desc' },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
              coas: { where: { isCurrent: true, active: true }, select: { id: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      },
      promoCode: true,
    },
  })
}

/**
 * Add a product to the user's cart, clamped to available inventory.
 * Inventory is never reserved by carts; final availability is re-checked
 * atomically at payment time.
 */
export async function addToCart(
  userId: string,
  productId: string,
  quantity: number
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { ok: false, error: 'Invalid quantity.' }
  }
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || !product.active) return { ok: false, error: 'This product is unavailable.' }
  if (product.priceCents === null)
    return { ok: false, error: 'This product is not currently available for purchase.' }
  if (product.inventoryQty <= 0) return { ok: false, error: 'This product is sold out.' }

  const cart = await getOrCreateActiveCart(userId)
  const existing = cart.items.find((i) => i.productId === productId)
  const requested = (existing?.quantity ?? 0) + quantity
  if (requested > product.inventoryQty) {
    return {
      ok: false,
      error: `Only ${product.inventoryQty} unit${product.inventoryQty === 1 ? '' : 's'} available.`,
    }
  }
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: requested } })
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } })
  }
  await touchCart(cart.id)
  return { ok: true }
}

export async function setCartItemQuantity(
  userId: string,
  productId: string,
  quantity: number
): Promise<{ ok: boolean; error?: string }> {
  const cart = await loadActiveCart(userId)
  if (!cart) return { ok: false, error: 'Cart not found.' }
  const item = cart.items.find((i) => i.productId === productId)
  if (!item) return { ok: false, error: 'Item not in cart.' }
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
    return { ok: false, error: 'Invalid quantity.' }
  }
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } })
  } else {
    const clamped = Math.min(quantity, Math.max(item.product.inventoryQty, 0))
    if (clamped === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } })
      await touchCart(cart.id)
      return { ok: false, error: 'This product is sold out and was removed from your cart.' }
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: clamped } })
    if (clamped < quantity) {
      await touchCart(cart.id)
      return { ok: false, error: `Only ${clamped} unit${clamped === 1 ? '' : 's'} available.` }
    }
  }
  await touchCart(cart.id)
  return { ok: true }
}

async function touchCart(cartId: string): Promise<void> {
  // Reset abandonment tracking whenever the cart changes.
  await prisma.cart.update({
    where: { id: cartId },
    data: { status: 'ACTIVE', abandonedEmailSentAt: null },
  })
}

export async function applyPromoToCart(
  userId: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const cart = await loadActiveCart(userId)
  if (!cart || cart.items.length === 0) return { ok: false, error: 'Your cart is empty.' }
  if (cart.promoCodeId) {
    return {
      ok: false,
      error: 'Only one promo code can be applied per order. Remove the current code first.',
    }
  }
  const tiers = await getBulkTiers()
  const subtotalAfterBulk = cart.items.reduce((sum, item) => {
    if (item.product.priceCents === null) return sum
    return sum + priceLine(item.product, item.quantity, tiers).lineTotal
  }, 0)
  const result = await validatePromoCode(code, userId, subtotalAfterBulk)
  if (!result.ok) return { ok: false, error: result.error }
  await prisma.cart.update({ where: { id: cart.id }, data: { promoCodeId: result.promo.id } })
  return { ok: true }
}

export async function removePromoFromCart(userId: string): Promise<void> {
  const cart = await loadActiveCart(userId)
  if (cart?.promoCodeId) {
    await prisma.cart.update({ where: { id: cart.id }, data: { promoCodeId: null } })
  }
}

/**
 * Price a loaded cart with full validation. Never trusts stored/browser
 * values: prices, tiers, promo eligibility and stock are all re-read here.
 */
export async function priceCart(
  cart: LoadedCart,
  opts: { shippingCents?: number | null; taxCents?: number | null; pointsToRedeem?: number } = {}
): Promise<CartPricing> {
  const tiers = await getBulkTiers()
  const problems: CartProblem[] = []
  const lines: PricedLine[] = []

  for (const item of cart.items) {
    const p = item.product
    if (!p.active) {
      problems.push({ productId: p.id, name: p.name, kind: 'UNAVAILABLE' })
      continue
    }
    if (p.priceCents === null) {
      problems.push({ productId: p.id, name: p.name, kind: 'NOT_PRICED' })
      continue
    }
    if (item.quantity > p.inventoryQty) {
      problems.push({
        productId: p.id,
        name: p.name,
        kind: 'INSUFFICIENT_STOCK',
        availableQty: Math.max(p.inventoryQty, 0),
      })
    }
    const priced = priceLine(p, item.quantity, tiers)
    lines.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      vialSize: p.vialSize,
      quantity: item.quantity,
      availableQty: Math.max(p.inventoryQty, 0),
      unitPriceCents: priced.unit,
      bulkDiscountPct: priced.pct,
      effectiveUnitCents: priced.effectiveUnit,
      lineTotalCents: priced.lineTotal,
      lineBulkDiscountCents: priced.bulkSavings,
      imageUrl: p.images[0]?.url ?? null,
      hasCurrentCoa: p.coas.length > 0,
    })
  }

  const subtotalCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0)
  const bulkDiscountCents = lines.reduce((s, l) => s + l.lineBulkDiscountCents, 0)
  const afterBulk = subtotalCents - bulkDiscountCents

  let promo: CartPricing['promo'] = null
  let promoDiscount = 0
  if (cart.promoCode) {
    const validation = await validatePromoCode(cart.promoCode.code, cart.userId, afterBulk)
    if (validation.ok) {
      promoDiscount = promoDiscountCents(validation.promo, afterBulk)
      promo = { code: cart.promoCode.code, error: null }
    } else {
      promo = { code: cart.promoCode.code, error: validation.error }
    }
  }

  const afterPromo = afterBulk - promoDiscount

  const rewards = await getRewardsConfig()
  const user = await prisma.user.findUnique({
    where: { id: cart.userId },
    select: { pointsBalance: true },
  })
  const pointsBalance = user?.pointsBalance ?? 0

  const referralFirstOrderEligible =
    rewards.referralEnabled && (await isReferralFirstOrderEligible(cart.userId))
  const referralDiscountCents = referralFirstOrderEligible
    ? Math.round((afterPromo * rewards.referralFirstOrderPercent) / 100)
    : 0
  const afterReferral = afterPromo - referralDiscountCents

  const requestedPoints = rewards.pointsEnabled ? Math.max(0, Math.floor(opts.pointsToRedeem ?? 0)) : 0
  const maxPointsBySpend = Math.floor((afterReferral * rewards.redemptionPerDollar) / 100)
  const pointsRedeemed = Math.min(requestedPoints, pointsBalance, maxPointsBySpend)
  const pointsDiscountCents = pointsRedemptionValueCents(pointsRedeemed, rewards.redemptionPerDollar)

  const merchandiseTotalCents = afterReferral - pointsDiscountCents
  const shipProgress = await getFreeShippingProgress(merchandiseTotalCents)
  const shippingCents = opts.shippingCents ?? 0
  const taxCents = opts.taxCents ?? null

  return {
    lines,
    subtotalCents,
    bulkDiscountCents,
    promoDiscountCents: promoDiscount,
    referralDiscountCents,
    referralFirstOrderEligible,
    pointsBalance,
    pointsRedeemed,
    pointsDiscountCents,
    merchandiseTotalCents,
    shippingCents,
    freeShippingThresholdCents: shipProgress.thresholdCents,
    freeShippingRemainingCents: shipProgress.remainingCents,
    freeShippingQualified: shipProgress.qualified,
    taxCents,
    totalCents: merchandiseTotalCents + shippingCents + (taxCents ?? 0),
    promo,
    problems,
    bulkTiers: [...tiers].sort((a, b) => a.minQty - b.minQty),
  }
}

/**
 * Resolve shipping cost for a method, honoring the free-shipping threshold.
 * LIVE_CARRIER methods require a destination + cart items (for weight) and
 * call the carrier rate API — never trust a client-supplied price for these.
 */
export async function resolveShippingCents(
  shippingMethodId: string,
  merchandiseTotalCents: number,
  live?: { destination: ShipAddress; cart: LoadedCart }
): Promise<{ ok: true; cents: number; methodName: string } | { ok: false; error: string }> {
  const method = await prisma.shippingMethod.findUnique({ where: { id: shippingMethodId } })
  if (!method || !method.active) return { ok: false, error: 'Invalid shipping method.' }
  const progress = await getFreeShippingProgress(merchandiseTotalCents)
  if (method.freeShippingEligible && progress.qualified) {
    return { ok: true, cents: 0, methodName: method.name }
  }
  if (method.rateType === 'LIVE_CARRIER') {
    if (!method.carrierServiceToken || !live) {
      return { ok: false, error: 'This shipping method requires a shipping address to be calculated.' }
    }
    const bufferOz = parseFloat(await getSetting(SETTING_KEYS.SHIP_PACKAGING_BUFFER_OZ)) || 0
    const weightOz =
      bufferOz + live.cart.items.reduce((sum, i) => sum + i.product.weightOz * i.quantity, 0)
    const rate = await getLiveShippingRateCents({
      destination: live.destination,
      weightOz,
      serviceToken: method.carrierServiceToken,
    })
    if (!rate.ok || rate.cents === undefined) {
      return { ok: false, error: rate.error ?? 'Could not calculate live shipping rate.' }
    }
    return { ok: true, cents: rate.cents, methodName: method.name }
  }
  return { ok: true, cents: method.priceCents, methodName: method.name }
}
