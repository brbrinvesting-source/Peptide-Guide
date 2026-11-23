import 'server-only'
import { prisma } from './db'
import { createAuthToken } from './auth'
import { sendEmail } from './email/provider'
import { broadcastEmail } from './email/templates'
import { absoluteUrl } from './site'

// Mass email to registered customers (Admin -> Broadcast Email). Separate
// from the transactional email path on purpose — see lib/email/provider.ts
// (BROADCAST sender override) and lib/email/templates.ts (broadcastEmail
// includes the CAN-SPAM-required physical address + unsubscribe link that
// transactional emails deliberately don't carry).

// Safety cap on recipients processed in one request — generous for this
// business's current scale. If the customer list ever grows past this,
// running the send again will just re-message whoever was missed, since
// there's no per-broadcast "already sent" tracking (not needed yet).
const MAX_RECIPIENTS = 1000

function recipientWhere() {
  return { marketingOptOut: false, disabled: false, emailVerified: true as const }
}

export async function getBroadcastRecipientCount(): Promise<number> {
  return prisma.user.count({ where: recipientWhere() })
}

async function unsubscribeUrlFor(userId: string): Promise<string> {
  // One year is effectively "forever" for an unsubscribe link without
  // needing an unbounded-lifetime token type — regenerated fresh on every
  // send, so it never actually expires in practice for an active recipient.
  const token = await createAuthToken(userId, 'UNSUBSCRIBE', 60 * 24 * 365)
  return absoluteUrl(`/unsubscribe?token=${token}`)
}

export interface BroadcastButton {
  label: string
  url: string
}

/** Send the broadcast to every eligible registered customer. */
export async function sendBroadcast(opts: {
  subject: string
  bodyText: string
  buttons?: BroadcastButton[]
}): Promise<{ recipients: number; sent: number; failed: number }> {
  const recipients = await prisma.user.findMany({
    where: recipientWhere(),
    select: { id: true, email: true },
    take: MAX_RECIPIENTS,
  })

  let sent = 0
  let failed = 0
  for (const user of recipients) {
    const unsubscribeUrl = await unsubscribeUrlFor(user.id)
    const email = broadcastEmail({ subject: opts.subject, bodyText: opts.bodyText, unsubscribeUrl, buttons: opts.buttons })
    const ok = await sendEmail('BROADCAST', { to: user.email, ...email }, { userId: user.id })
    if (ok) sent++
    else failed++
  }
  return { recipients: recipients.length, sent, failed }
}

/** Send a single preview copy to one address (e.g. the admin composing it). */
export async function sendBroadcastTest(opts: {
  subject: string
  bodyText: string
  toUserId: string
  toEmail: string
  buttons?: BroadcastButton[]
}): Promise<boolean> {
  const unsubscribeUrl = await unsubscribeUrlFor(opts.toUserId)
  const email = broadcastEmail({
    subject: `[TEST] ${opts.subject}`,
    bodyText: opts.bodyText,
    unsubscribeUrl,
    buttons: opts.buttons,
  })
  return sendEmail('BROADCAST', { to: opts.toEmail, ...email }, { userId: opts.toUserId, test: true })
}
