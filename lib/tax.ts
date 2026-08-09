import 'server-only'
import { getSetting, SETTING_KEYS } from './settings'
import { getStripe } from './payments/stripe'

// Destination-based sales tax. Provider is configurable:
//   'stripe' — Stripe Tax calculation API (recommended; requires Stripe Tax
//              to be enabled on the Stripe account)
//   'flat'   — flat basis-points rate from settings (fallback/testing only)
//   'none'   — no tax collected (only if legally appropriate)

export interface TaxDestination {
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
}

export interface TaxResult {
  taxCents: number
  provider: string
}

export async function calculateTax(params: {
  merchandiseTotalCents: number
  shippingCents: number
  destination: TaxDestination
}): Promise<TaxResult> {
  const provider = await getSetting(SETTING_KEYS.TAX_PROVIDER)

  if (provider === 'none') return { taxCents: 0, provider: 'none' }

  if (provider === 'flat') {
    const bps = parseInt(await getSetting(SETTING_KEYS.TAX_FLAT_RATE_BPS), 10) || 0
    return {
      taxCents: Math.round(((params.merchandiseTotalCents + params.shippingCents) * bps) / 10_000),
      provider: 'flat',
    }
  }

  // Stripe Tax
  const calculation = await getStripe().tax.calculations.create({
    currency: 'usd',
    line_items: [
      {
        amount: params.merchandiseTotalCents,
        reference: 'merchandise',
        tax_behavior: 'exclusive',
      },
    ],
    shipping_cost: { amount: params.shippingCents },
    customer_details: {
      address: {
        line1: params.destination.line1,
        line2: params.destination.line2 ?? undefined,
        city: params.destination.city,
        state: params.destination.state,
        postal_code: params.destination.postalCode,
        country: 'US',
      },
      address_source: 'shipping',
    },
  })
  return { taxCents: calculation.tax_amount_exclusive, provider: 'stripe' }
}
