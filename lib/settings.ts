import { prisma } from './db'

// Central, database-backed store settings. Every business rule that can
// change (thresholds, tiers, timings, copy) lives here — never hard-coded.

export const SETTING_KEYS = {
  STORE_NAME: 'store.name',
  STORE_CONTACT_EMAIL: 'store.contactEmail',
  STORE_CONTACT_INFO: 'store.contactInfo',
  FREE_SHIPPING_THRESHOLD_CENTS: 'shipping.freeThresholdCents',
  SHIP_FROM_NAME: 'shipping.fromName',
  SHIP_FROM_LINE1: 'shipping.fromLine1',
  SHIP_FROM_LINE2: 'shipping.fromLine2',
  SHIP_FROM_CITY: 'shipping.fromCity',
  SHIP_FROM_STATE: 'shipping.fromState',
  SHIP_FROM_ZIP: 'shipping.fromZip',
  SHIP_FROM_PHONE: 'shipping.fromPhone',
  SHIP_PACKAGE_LENGTH_IN: 'shipping.packageLengthIn',
  SHIP_PACKAGE_WIDTH_IN: 'shipping.packageWidthIn',
  SHIP_PACKAGE_HEIGHT_IN: 'shipping.packageHeightIn',
  SHIP_PACKAGING_BUFFER_OZ: 'shipping.packagingBufferOz',
  BULK_TIERS: 'discounts.bulkTiers', // JSON: [{minQty, percentOff}]
  SHIPPING_INSURANCE_ENABLED: 'shipping.insuranceEnabled',
  // JSON: [{maxCents, priceCents}], ascending by maxCents. Last tier's
  // maxCents may be null to mean "and up". Priced on merchandise subtotal
  // only (before shipping/tax/discounts already applied).
  SHIPPING_INSURANCE_TIERS: 'shipping.insuranceTiers',
  WELCOME_DISCOUNT_PERCENT: 'discounts.welcomePercent',
  WELCOME_PROMO_ENABLED: 'discounts.welcomeEnabled',
  WELCOME_PROMO_CODE: 'discounts.welcomeCode',
  // Rewards points: earn POINTS_EARN_CENTS_PER_POINT of merchandise spend per
  // point, redeem POINTS_REDEMPTION_PER_DOLLAR points per $1 of discount.
  POINTS_PROGRAM_ENABLED: 'rewards.pointsEnabled',
  POINTS_EARN_CENTS_PER_POINT: 'rewards.earnCentsPerPoint',
  POINTS_REDEMPTION_PER_DOLLAR: 'rewards.redemptionPerDollar',
  // Referrals: referrer earns REFERRAL_POINTS_MULTIPLIER x the normal rate
  // on a referred friend's first paid order, then the normal (1x) rate on
  // every purchase that friend makes after that. The friend earns the same
  // multiplier (but only on their own first paid order) and gets
  // REFERRAL_FIRST_ORDER_DISCOUNT_PERCENT off automatically — no code to
  // enter, stacks with a manually-entered promo code.
  REFERRAL_PROGRAM_ENABLED: 'rewards.referralEnabled',
  REFERRAL_POINTS_MULTIPLIER: 'rewards.referralMultiplier',
  REFERRAL_FIRST_ORDER_DISCOUNT_PERCENT: 'rewards.referralFirstOrderPercent',
  LOW_STOCK_DEFAULT_THRESHOLD: 'inventory.lowStockDefault',
  ABANDONED_CART_DELAY_MINUTES: 'email.abandonedCartDelayMinutes',
  ABANDONED_CART_SUBJECT: 'email.abandonedCartSubject',
  EMAIL_SENDER_NAME: 'email.senderName',
  EMAIL_SENDER_ADDRESS: 'email.senderAddress',
  WELCOME_SENDER_NAME: 'email.welcomeSenderName',
  WELCOME_SENDER_ADDRESS: 'email.welcomeSenderAddress',
  ADMIN_NOTIFICATION_EMAIL: 'email.adminNotificationAddress',
  TAX_PROVIDER: 'tax.provider', // 'stripe' | 'flat' | 'none'
  TAX_FLAT_RATE_BPS: 'tax.flatRateBps', // basis points fallback when provider = 'flat'
  DISCLAIMER_VERSION: 'legal.disclaimerVersion',
  RESEARCHER_ATTESTATION_VERSION: 'legal.researcherAttestationVersion',
} as const

export interface BulkTier {
  minQty: number
  percentOff: number
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.STORE_NAME]: 'All-Access Peptides',
  [SETTING_KEYS.STORE_CONTACT_EMAIL]: 'support@all-accesspeptides.com',
  [SETTING_KEYS.STORE_CONTACT_INFO]: 'support@all-accesspeptides.com',
  [SETTING_KEYS.FREE_SHIPPING_THRESHOLD_CENTS]: '25000',
  [SETTING_KEYS.SHIP_FROM_NAME]: 'All-Access Peptides',
  [SETTING_KEYS.SHIP_FROM_LINE1]: '',
  [SETTING_KEYS.SHIP_FROM_LINE2]: '',
  [SETTING_KEYS.SHIP_FROM_CITY]: 'Glendale',
  [SETTING_KEYS.SHIP_FROM_STATE]: 'CA',
  [SETTING_KEYS.SHIP_FROM_ZIP]: '91206',
  [SETTING_KEYS.SHIP_FROM_PHONE]: '',
  [SETTING_KEYS.SHIP_PACKAGE_LENGTH_IN]: '8',
  [SETTING_KEYS.SHIP_PACKAGE_WIDTH_IN]: '6',
  [SETTING_KEYS.SHIP_PACKAGE_HEIGHT_IN]: '4',
  [SETTING_KEYS.SHIP_PACKAGING_BUFFER_OZ]: '2',
  [SETTING_KEYS.BULK_TIERS]: JSON.stringify([
    { minQty: 5, percentOff: 5 },
    { minQty: 10, percentOff: 10 },
  ]),
  [SETTING_KEYS.SHIPPING_INSURANCE_ENABLED]: 'true',
  [SETTING_KEYS.SHIPPING_INSURANCE_TIERS]: JSON.stringify([
    { maxCents: 10000, priceCents: 200 },
    { maxCents: 20000, priceCents: 300 },
    { maxCents: 30000, priceCents: 400 },
    { maxCents: 40000, priceCents: 550 },
    { maxCents: 50000, priceCents: 650 },
    { maxCents: 60000, priceCents: 800 },
    { maxCents: 70000, priceCents: 900 },
    { maxCents: 80000, priceCents: 1050 },
    { maxCents: 90000, priceCents: 1150 },
    { maxCents: 100000, priceCents: 1300 },
    { maxCents: 150000, priceCents: 2000 },
    { maxCents: 200000, priceCents: 2500 },
    { maxCents: null, priceCents: 3000 },
  ]),
  [SETTING_KEYS.WELCOME_DISCOUNT_PERCENT]: '20',
  [SETTING_KEYS.WELCOME_PROMO_ENABLED]: 'true',
  [SETTING_KEYS.WELCOME_PROMO_CODE]: 'WELCOME20',
  [SETTING_KEYS.POINTS_PROGRAM_ENABLED]: 'true',
  [SETTING_KEYS.POINTS_EARN_CENTS_PER_POINT]: '2000', // 1 point per $20
  [SETTING_KEYS.POINTS_REDEMPTION_PER_DOLLAR]: '1', // 1 point = $1
  [SETTING_KEYS.REFERRAL_PROGRAM_ENABLED]: 'true',
  [SETTING_KEYS.REFERRAL_POINTS_MULTIPLIER]: '2',
  [SETTING_KEYS.REFERRAL_FIRST_ORDER_DISCOUNT_PERCENT]: '10',
  [SETTING_KEYS.LOW_STOCK_DEFAULT_THRESHOLD]: '5',
  [SETTING_KEYS.ABANDONED_CART_DELAY_MINUTES]: '90',
  [SETTING_KEYS.ABANDONED_CART_SUBJECT]: 'You left something behind',
  [SETTING_KEYS.EMAIL_SENDER_NAME]: 'All-Access Peptides',
  [SETTING_KEYS.EMAIL_SENDER_ADDRESS]: 'no-reply@all-accesspeptides.com',
  [SETTING_KEYS.WELCOME_SENDER_NAME]: '',
  [SETTING_KEYS.WELCOME_SENDER_ADDRESS]: '',
  [SETTING_KEYS.ADMIN_NOTIFICATION_EMAIL]: '',
  [SETTING_KEYS.TAX_PROVIDER]: 'stripe',
  [SETTING_KEYS.TAX_FLAT_RATE_BPS]: '0',
  [SETTING_KEYS.DISCLAIMER_VERSION]: '1.0',
  [SETTING_KEYS.RESEARCHER_ATTESTATION_VERSION]: '1.0',
}

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key } })
  return row?.value ?? DEFAULT_SETTINGS[key] ?? ''
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } })
  const map: Record<string, string> = {}
  for (const key of keys) {
    map[key] = rows.find((r) => r.key === key)?.value ?? DEFAULT_SETTINGS[key] ?? ''
  }
  return map
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

export async function getBulkTiers(): Promise<BulkTier[]> {
  try {
    const raw = await getSetting(SETTING_KEYS.BULK_TIERS)
    const tiers = JSON.parse(raw) as BulkTier[]
    return tiers
      .filter((t) => Number.isInteger(t.minQty) && t.minQty > 1 && t.percentOff >= 0 && t.percentOff <= 90)
      .sort((a, b) => b.minQty - a.minQty) // highest tier first
  } catch {
    return [
      { minQty: 10, percentOff: 10 },
      { minQty: 5, percentOff: 5 },
    ]
  }
}

export async function getFreeShippingThresholdCents(): Promise<number> {
  const v = parseInt(await getSetting(SETTING_KEYS.FREE_SHIPPING_THRESHOLD_CENTS), 10)
  return Number.isFinite(v) && v >= 0 ? v : 25000
}

export interface InsuranceTier {
  maxCents: number | null // null = no upper bound ("and up")
  priceCents: number
}

export async function getInsuranceTiers(): Promise<InsuranceTier[]> {
  try {
    const raw = await getSetting(SETTING_KEYS.SHIPPING_INSURANCE_TIERS)
    const tiers = JSON.parse(raw) as InsuranceTier[]
    return tiers
      .filter((t) => (t.maxCents === null || (Number.isInteger(t.maxCents) && t.maxCents > 0)) && t.priceCents > 0)
      .sort((a, b) => (a.maxCents === null ? 1 : b.maxCents === null ? -1 : a.maxCents - b.maxCents))
  } catch {
    return []
  }
}

/** Shipping insurance price for a merchandise subtotal, or null if unavailable/disabled. */
export async function getInsuranceCents(merchandiseTotalCents: number): Promise<number | null> {
  if ((await getSetting(SETTING_KEYS.SHIPPING_INSURANCE_ENABLED)) !== 'true') return null
  const tiers = await getInsuranceTiers()
  const tier = tiers.find((t) => t.maxCents === null || merchandiseTotalCents < t.maxCents)
  return tier ? tier.priceCents : null
}
