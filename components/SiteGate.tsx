import { cookies } from 'next/headers'
import { SITE_GATE_COOKIE } from '@/lib/constants'
import { SiteGateModal } from './SiteGateModal'

// Server-side gate check — if the visitor already has the acceptance
// cookie, nothing is rendered (avoids a flash of the modal on load).
export async function SiteGate() {
  const store = await cookies()
  const accepted = store.get(SITE_GATE_COOKIE)?.value === '1'
  if (accepted) return null
  return <SiteGateModal />
}
