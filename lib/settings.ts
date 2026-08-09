import { prisma } from './db'

// Central, database-backed store settings. Every business rule that can
// change (thresholds, tiers, timings, copy) lives here — never hard-coded.

export const SETTING_KEYS = {
  STORE_NAME: 'store.name',
  STORE_CONTACT_EMAIL: 'store.contactEmail',
  STORE_CONTACT_INFO: 'store.contactInfo',
  FREE_SHIPPING_THRESHOLD_CENTS: 'shipping.freeThresholdCents',
  BULK_TIERS: 'discounts.bulkTiers', // JSON: [{minQty, percentOff}]
  WELCOME_DISCOUNT_PERCENT: 'discounts.welcomePercent',
  WELCOME_PROMO_ENABLED: 'discounts.welcomeEnabled',
  LOW_STOCK_DEFAULT_THRESHOLD: 'inventory.lowStockDefault',
  ABANDONED_CART_DELAY_MINUTES: 'email.abandonedCartDelayMinutes',
  ABANDONED_CART_SUBJECT: 'email.abandonedCartSubject',
  EMAIL_SENDER_NAME: 'email.senderName',
  EMAIL_SENDER_ADDRESS: 'email.senderAddress',
  ADMIN_NOTIFICATION_EMAIL: 'email.adminNotificationAddress',
  TAX_PROVIDER: 'tax.provider', // 'stripe' | 'flat' | 'none'
  TAX_FLAT_RATE_BPS: 'tax.flatRateBps', // basis points fallback when provider = 'flat'
  DISCLAIMER_VERSION: 'legal.disclaimerVersion',
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
  [SETTING_KEYS.BULK_TIERS]: JSON.stringify([
    { minQty: 5, percentOff: 5 },
    { minQty: 10, percentOff: 10 },
  ]),
  [SETTING_KEYS.WELCOME_DISCOUNT_PERCENT]: '20',
  [SETTING_KEYS.WELCOME_PROMO_ENABLED]: 'true',
  [SETTING_KEYS.LOW_STOCK_DEFAULT_THRESHOLD]: '5',
  [SETTING_KEYS.ABANDONED_CART_DELAY_MINUTES]: '90',
  [SETTING_KEYS.ABANDONED_CART_SUBJECT]: 'You left something behind',
  [SETTING_KEYS.EMAIL_SENDER_NAME]: 'All-Access Peptides',
  [SETTING_KEYS.EMAIL_SENDER_ADDRESS]: 'no-reply@all-accesspeptides.com',
  [SETTING_KEYS.ADMIN_NOTIFICATION_EMAIL]: '',
  [SETTING_KEYS.TAX_PROVIDER]: 'stripe',
  [SETTING_KEYS.TAX_FLAT_RATE_BPS]: '0',
  [SETTING_KEYS.DISCLAIMER_VERSION]: '1.0',
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
