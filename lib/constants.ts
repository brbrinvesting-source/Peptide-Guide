// Enum-like string constants (schema stays portable between SQLite/Postgres)

export const ROLES = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const ORDER_STATUSES = [
  'PENDING',
  'PAYMENT_PROCESSING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'FULFILLED',
  'CANCELLED',
  'REFUNDED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const INVENTORY_REASONS = [
  'INITIAL',
  'RESTOCK',
  'SALE',
  'MANUAL_CORRECTION',
  'DAMAGED',
  'LOST',
  'REFUND_RESTOCK',
  'OTHER',
] as const
export type InventoryReason = (typeof INVENTORY_REASONS)[number]

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

export const RESEARCH_DISCLAIMER_SHORT =
  'For research use only. Not for human or veterinary consumption.'

export const CHECKOUT_ACKNOWLEDGEMENT_TEXT =
  'I understand and agree that the products purchased through All-Access Peptides are intended for research purposes only and are not intended for human or veterinary consumption.'

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT'

export function stockStatus(qty: number, lowThreshold: number): StockStatus {
  if (qty <= 0) return 'SOLD_OUT'
  if (qty <= lowThreshold) return 'LOW_STOCK'
  return 'IN_STOCK'
}

export const STOCK_LABELS: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  SOLD_OUT: 'Sold Out',
}
