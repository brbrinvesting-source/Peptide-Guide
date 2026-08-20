import 'server-only'
import { SHIPPING_STATES } from './constants'

// US address typeahead via Smarty's US Autocomplete Pro API. Server-side
// only — the secret key pair is never exposed to the browser; the checkout
// page calls our own /api/checkout/address-autocomplete route instead.

export interface AddressSuggestion {
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
}

/** Suggest US addresses for a partial search string, restricted to states we
 * actually ship to. Returns an empty list (never throws) if Smarty isn't
 * configured or the request fails — autocomplete is a progressive
 * enhancement, checkout must keep working without it. */
export async function suggestAddresses(search: string): Promise<AddressSuggestion[]> {
  const authId = process.env.SMARTY_AUTH_ID
  const authToken = process.env.SMARTY_AUTH_TOKEN
  const trimmed = search.trim()
  if (!authId || !authToken || trimmed.length < 3) return []

  const params = new URLSearchParams({
    'auth-id': authId,
    'auth-token': authToken,
    search: trimmed,
    max_results: '5',
    include_only_states: Object.keys(SHIPPING_STATES).join(','),
  })

  let res: Response
  try {
    res = await fetch(`https://us-autocomplete-pro.api.smarty.com/lookup?${params}`)
  } catch {
    return []
  }
  if (!res.ok) return []

  let data: {
    suggestions?: { street_line?: string; secondary?: string; city?: string; state?: string; zipcode?: string }[]
  }
  try {
    data = await res.json()
  } catch {
    return []
  }

  return (data.suggestions ?? [])
    .filter((s) => s.street_line && s.city && s.state && s.zipcode)
    .map((s) => ({
      line1: s.street_line!,
      line2: s.secondary ?? '',
      city: s.city!,
      state: s.state!,
      postalCode: s.zipcode!,
    }))
}
