import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { suggestAddresses } from '@/lib/address-autocomplete'

// Checkout address typeahead. Read-only, no cart/pricing implications — the
// selected suggestion is just a convenience prefill; the address itself is
// still fully re-validated server-side at order creation like any other
// manually-typed address.

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!rateLimit(`address-autocomplete:${user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const search = (req.nextUrl.searchParams.get('search') ?? '').slice(0, 200)
  const suggestions = await suggestAddresses(search)
  return NextResponse.json({ suggestions })
}
