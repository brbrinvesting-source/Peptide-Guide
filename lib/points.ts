import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from './db'
import { getSettings, SETTING_KEYS } from './settings'

type Tx = Prisma.TransactionClient

/** Points earned for a given amount of merchandise spend, floored. */
export function pointsForAmountCents(amountCents: number, earnCentsPerPoint: number): number {
  if (amountCents <= 0 || earnCentsPerPoint <= 0) return 0
  return Math.floor(amountCents / earnCentsPerPoint)
}

/** Dollar-value discount (in cents) for redeeming N points. */
export function pointsRedemptionValueCents(points: number, redemptionPerDollar: number): number {
  if (points <= 0 || redemptionPerDollar <= 0) return 0
  return Math.floor((points * 100) / redemptionPerDollar)
}

export interface RewardsConfig {
  pointsEnabled: boolean
  earnCentsPerPoint: number
  redemptionPerDollar: number
  referralEnabled: boolean
  referralMultiplier: number
  referralFirstOrderPercent: number
}

export async function getRewardsConfig(): Promise<RewardsConfig> {
  const s = await getSettings([
    SETTING_KEYS.POINTS_PROGRAM_ENABLED,
    SETTING_KEYS.POINTS_EARN_CENTS_PER_POINT,
    SETTING_KEYS.POINTS_REDEMPTION_PER_DOLLAR,
    SETTING_KEYS.REFERRAL_PROGRAM_ENABLED,
    SETTING_KEYS.REFERRAL_POINTS_MULTIPLIER,
    SETTING_KEYS.REFERRAL_FIRST_ORDER_DISCOUNT_PERCENT,
  ])
  return {
    pointsEnabled: s[SETTING_KEYS.POINTS_PROGRAM_ENABLED] === 'true',
    earnCentsPerPoint: parseInt(s[SETTING_KEYS.POINTS_EARN_CENTS_PER_POINT], 10) || 1000,
    redemptionPerDollar: parseInt(s[SETTING_KEYS.POINTS_REDEMPTION_PER_DOLLAR], 10) || 100,
    referralEnabled: s[SETTING_KEYS.REFERRAL_PROGRAM_ENABLED] === 'true',
    referralMultiplier: Math.max(1, parseInt(s[SETTING_KEYS.REFERRAL_POINTS_MULTIPLIER], 10) || 2),
    referralFirstOrderPercent: Math.min(
      90,
      Math.max(0, parseInt(s[SETTING_KEYS.REFERRAL_FIRST_ORDER_DISCOUNT_PERCENT], 10) || 10)
    ),
  }
}

/** Has this user ever had an order reach PAID? Determines first-order referral perks. */
export async function hasEverPaidOrder(userId: string): Promise<boolean> {
  const paid = await prisma.order.findFirst({ where: { userId, paymentStatus: 'PAID' }, select: { id: true } })
  return paid !== null
}

/**
 * Referral first-order eligibility: the user was referred and has never had
 * a paid order. Drives both the 2x earn multiplier and the automatic
 * first-order discount — both keyed off the exact same check so they can
 * never disagree with each other.
 */
export async function isReferralFirstOrderEligible(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } })
  if (!user?.referredById) return false
  return !(await hasEverPaidOrder(userId))
}

/**
 * Credit or debit a user's points balance atomically, recording a ledger
 * entry. Must run inside the same transaction as the order-finalizing
 * write. A conditional update guards against a redemption exceeding the
 * balance at the moment of debit (defense in depth — the primary guard is
 * that a user can only ever have one live pending order at a time).
 */
export async function applyPointsChange(
  tx: Tx,
  params: { userId: string; orderId?: string; type: string; points: number; note?: string; adminId?: string }
): Promise<{ ok: true; newBalance: number } | { ok: false; error: string }> {
  if (params.points === 0) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { pointsBalance: true } })
    return { ok: true, newBalance: user.pointsBalance }
  }

  if (params.points < 0) {
    const updated = await tx.user.updateMany({
      where: { id: params.userId, pointsBalance: { gte: -params.points } },
      data: { pointsBalance: { increment: params.points } },
    })
    if (updated.count === 0) return { ok: false, error: 'Insufficient points balance.' }
  } else {
    await tx.user.update({ where: { id: params.userId }, data: { pointsBalance: { increment: params.points } } })
  }

  const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { pointsBalance: true } })
  const previousBalance = user.pointsBalance - params.points
  await tx.pointsTransaction.create({
    data: {
      userId: params.userId,
      orderId: params.orderId,
      type: params.type,
      points: params.points,
      previousBalance,
      newBalance: user.pointsBalance,
      note: params.note,
      adminId: params.adminId,
    },
  })
  return { ok: true, newBalance: user.pointsBalance }
}

/**
 * Best-effort claw-back for a refund: reduces a balance by up to `points`,
 * but never below zero and never fails outright. If the points were already
 * spent elsewhere, this recovers whatever is left rather than blocking the
 * refund — there is no way to recover points that no longer exist.
 */
export async function clawBackPoints(
  tx: Tx,
  params: { userId: string; orderId?: string; points: number; note?: string }
): Promise<void> {
  if (params.points <= 0) return
  const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { pointsBalance: true } })
  const actual = Math.min(params.points, user.pointsBalance)
  if (actual <= 0) return
  await applyPointsChange(tx, {
    userId: params.userId,
    orderId: params.orderId,
    type: 'REFUND_REVERSED',
    points: -actual,
    note: params.note,
  })
}
