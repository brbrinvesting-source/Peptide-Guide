import 'server-only'
import { getSettings, SETTING_KEYS } from './settings'

// Live carrier rate lookup via Shippo. Kept as a small, swappable surface
// (like payments/email/tax) in case another rate API is added later.

export interface ShipAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  phone?: string
}

export interface LiveRateResult {
  ok: boolean
  cents?: number
  error?: string
}

/**
 * Fetch a live rate for a specific carrier service (e.g. Shippo's
 * "ups_2nd_day_air" token) from the configured ship-from address to a
 * destination, for a given total package weight.
 */
export async function getLiveShippingRateCents(params: {
  destination: ShipAddress
  weightOz: number
  serviceToken: string
}): Promise<LiveRateResult> {
  const apiKey = process.env.SHIPPO_API_KEY
  if (!apiKey) return { ok: false, error: 'Live shipping rates are not configured.' }

  const s = await getSettings([
    SETTING_KEYS.SHIP_FROM_NAME,
    SETTING_KEYS.SHIP_FROM_LINE1,
    SETTING_KEYS.SHIP_FROM_LINE2,
    SETTING_KEYS.SHIP_FROM_CITY,
    SETTING_KEYS.SHIP_FROM_STATE,
    SETTING_KEYS.SHIP_FROM_ZIP,
    SETTING_KEYS.SHIP_FROM_PHONE,
    SETTING_KEYS.SHIP_PACKAGE_LENGTH_IN,
    SETTING_KEYS.SHIP_PACKAGE_WIDTH_IN,
    SETTING_KEYS.SHIP_PACKAGE_HEIGHT_IN,
  ])
  if (!s[SETTING_KEYS.SHIP_FROM_LINE1]) {
    return { ok: false, error: 'Ship-from address is not configured yet.' }
  }

  let res: Response
  try {
    res = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: {
          name: s[SETTING_KEYS.SHIP_FROM_NAME],
          street1: s[SETTING_KEYS.SHIP_FROM_LINE1],
          street2: s[SETTING_KEYS.SHIP_FROM_LINE2] || undefined,
          city: s[SETTING_KEYS.SHIP_FROM_CITY],
          state: s[SETTING_KEYS.SHIP_FROM_STATE],
          zip: s[SETTING_KEYS.SHIP_FROM_ZIP],
          country: 'US',
          phone: s[SETTING_KEYS.SHIP_FROM_PHONE] || undefined,
        },
        address_to: {
          name: params.destination.name,
          street1: params.destination.line1,
          street2: params.destination.line2 || undefined,
          city: params.destination.city,
          state: params.destination.state,
          zip: params.destination.postalCode,
          country: 'US',
          phone: params.destination.phone || undefined,
        },
        parcels: [
          {
            length: s[SETTING_KEYS.SHIP_PACKAGE_LENGTH_IN],
            width: s[SETTING_KEYS.SHIP_PACKAGE_WIDTH_IN],
            height: s[SETTING_KEYS.SHIP_PACKAGE_HEIGHT_IN],
            distance_unit: 'in',
            weight: String(Math.max(params.weightOz, 0.1)),
            mass_unit: 'oz',
          },
        ],
        async: false,
      }),
    })
  } catch {
    return { ok: false, error: 'Could not reach the shipping rate service.' }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`Shippo API error ${res.status}: ${body.slice(0, 300)}`)
    return { ok: false, error: 'Could not calculate a live shipping rate for this address.' }
  }

  const data: { rates?: { amount: string; servicelevel?: { token?: string } }[]; messages?: unknown[] } =
    await res.json()
  const rate = data.rates?.find((r) => r.servicelevel?.token === params.serviceToken)
  if (!rate) {
    return { ok: false, error: 'This shipping service is not available for that address.' }
  }
  const cents = Math.round(Number(rate.amount) * 100)
  if (!Number.isFinite(cents) || cents <= 0) {
    return { ok: false, error: 'Received an invalid rate from the shipping service.' }
  }
  return { ok: true, cents }
}
