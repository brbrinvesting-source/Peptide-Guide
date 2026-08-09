import 'server-only'
import { prisma } from './db'
import { getBulkTiers, getFreeShippingThresholdCents, type BulkTier } from './settings'
import type { PromoCode, Product } from '@prisma/client'

// ---------------------------------------------------------------------------
// Authoritative server-side price calculation.
//
//   PRODUCT SUBTOTAL − BULK DISCOUNT − PROMO DISCOUNT + SHIPPING + TAX = TOTAL
//
// Bulk discount stacks with exactly ONE promo code. Promo codes never stack
// with each other (a cart holds at most one promoCodeId — enforced here and
// at the schema level).
// ---------------------------------------------------------------------------

export interface PricedLine {
  productId: string
  name: string
  slug: string
  sku: string
  vialSize: string
  quantity: number
  availableQty: number
  unitPriceCents: number
  bulkDiscountPct: number
  effectiveUnitCents: number
  lineTotalCents: number
  lineBulkDiscountCents: number
  imageUrl: string | null
  hasCurrentCoa: boolean
}

export interface CartPricing {
  lines: PricedLine[]
  subtotalCents: number
  bulkDiscountCents: number
  promoDiscountCents: number
  merchandiseTotalCents: number // subtotal − bulk − promo
  shippingCents: number
  freeShippingThresholdCents: number
  freeShippingRemainingCents: number // 0 when qualified
  freeShippingQualified: boolean
  taxCents: number | null // null until a destination is known
  totalCents: number // merchandise + shipping + (tax ?? 0)
  promo: { code: string; error: string | null } | null
  problems: CartProblem[]
  bulkTiers: BulkTier[]
}

export interface CartProblem {
  productId: string
  name: string
  kind: 'UNAVAILABLE' | 'INSUFFICIENT_STOCK' | 'NOT_PRICED'
  availableQty?: number
}

export function bulkPercentFor(quantity: number, tiers: BulkTier[]): number {
  for (const tier of tiers) {
    if (quantity >= tier.minQty) return tier.percentOff
  }
  return 0
}

export function priceLine(
  product: Pick<Product, 'priceCents'>,
  quantity: number,
  tiers: BulkTier[]
): { unit: number; pct: number; effectiveUnit: number; lineTotal: number; bulkSavings: number } {
  const unit = product.priceCents ?? 0
  const pct = bulkPercentFor(quantity, tiers)
  const effectiveUnit = Math.round(unit - (unit * pct) / 100)
  const lineTotal = effectiveUnit * quantity
  return { unit, pct, effectiveUnit, lineTotal, bulkSavings: unit * quantity - lineTotal }
}

export type PromoValidationResult =
  | { ok: true; promo: PromoCode }
  | { ok: false; error: string }

/**
 * Validate a promo code for a user + subtotal. All rules enforced server-side:
 * active window, min purchase, global + per-customer limits, welcome-code
 * account binding and single redemption.
 */
export async function validatePromoCode(
  code: string,
  userId: string,
  subtotalAfterBulkCents: number
): Promise<PromoValidationResult> {
  const promo = await prisma.promoCode.findFirst({
    where: { code: code.trim().toUpperCase() },
  })
  if (!promo || !promo.active) return { ok: false, error: 'This promo code is not valid.' }

  const now = new Date()
  if (promo.startsAt && promo.startsAt > now)
    return { ok: false, error: 'This promo code is not active yet.' }
  if (promo.expiresAt && promo.expiresAt < now)
    return { ok: false, error: 'This promo code has expired.' }

  if (promo.restrictedToUserId && promo.restrictedToUserId !== userId)
    return { ok: false, error: 'This promo code is linked to a different account.' }

  if (promo.isWelcomeCode) {
    const wp = await prisma.welcomePromotion.findUnique({ where: { promoCodeId: promo.id } })
    if (!wp || wp.userId !== userId)
      return { ok: false, error: 'This promo code is linked to a different account.' }
    if (wp.redeemedAt)
      return { ok: false, error: 'Your welcome discount has already been redeemed.' }
  }

  if (promo.minSubtotalCents > 0 && subtotalAfterBulkCents < promo.minSubtotalCents)
    return {
      ok: false,
      error: `This code requires a minimum purchase of $${(promo.minSubtotalCents / 100).toFixed(2)}.`,
    }

  if (promo.maxTotalUses !== null) {
    const uses = await prisma.promoRedemption.count({ where: { promoCodeId: promo.id } })
    if (uses >= promo.maxTotalUses)
      return { ok: false, error: 'This promo code has reached its usage limit.' }
  }

  const perLimit = promo.isWelcomeCode ? 1 : promo.perCustomerLimit
  if (perLimit !== null) {
    const userUses = await prisma.promoRedemption.count({
      where: { promoCodeId: promo.id, userId },
    })
    if (userUses >= perLimit)
      return { ok: false, error: 'You have already used this promo code.' }
  }

  return { ok: true, promo }
}

export function promoDiscountCents(promo: PromoCode, baseCents: number): number {
  if (baseCents <= 0) return 0
  if (promo.discountType === 'PERCENT') {
    return Math.min(baseCents, Math.round((baseCents * promo.discountValue) / 100))
  }
  return Math.min(baseCents, promo.discountValue)
}

export async function getFreeShippingProgress(merchandiseTotalCents: number): Promise<{
  thresholdCents: number
  remainingCents: number
  qualified: boolean
}> {
  const thresholdCents = await getFreeShippingThresholdCents()
  const qualified = merchandiseTotalCents >= thresholdCents
  return {
    thresholdCents,
    remainingCents: qualified ? 0 : thresholdCents - merchandiseTotalCents,
    qualified,
  }
}

export { getBulkTiers }
