import { requireAdmin } from '@/lib/auth'
import { getBroadcastRecipientCount } from '@/lib/broadcast'
import { getSetting, SETTING_KEYS } from '@/lib/settings'
import { BroadcastForm } from './BroadcastForm'

export default async function AdminBroadcastPage() {
  await requireAdmin()
  const [recipientCount, senderName, senderAddress] = await Promise.all([
    getBroadcastRecipientCount(),
    getSetting(SETTING_KEYS.BROADCAST_SENDER_NAME),
    getSetting(SETTING_KEYS.BROADCAST_SENDER_ADDRESS),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Broadcast email</h1>
      <p className="mt-2 max-w-2xl text-xs text-muted">
        Sends to every registered customer who is email-verified, not disabled, and hasn&apos;t
        opted out of marketing emails. Each email includes a working unsubscribe link and your
        business mailing address, as required for commercial email. Sends from{' '}
        <span className="text-fg">{senderName} &lt;{senderAddress}&gt;</span> — change this in{' '}
        <span className="text-fg">Admin → Settings → Email → Broadcast sender</span>.
      </p>
      <BroadcastForm recipientCount={recipientCount} />
    </div>
  )
}
