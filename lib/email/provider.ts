import 'server-only'
import { prisma } from '../db'
import { getSettings, SETTING_KEYS } from '../settings'

// Email provider abstraction. The active provider is chosen via EMAIL_PROVIDER
// env var: "resend" (default when RESEND_API_KEY is set) or "console" (dev).
// Adding a provider = implementing EmailProvider and registering it here.

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailProvider {
  send(msg: EmailMessage & { from: string }): Promise<void>
}

class ConsoleEmailProvider implements EmailProvider {
  async send(msg: EmailMessage & { from: string }): Promise<void> {
    console.log(
      `\n=== EMAIL (console provider) ===\nFrom: ${msg.from}\nTo: ${msg.to}\nSubject: ${msg.subject}\n--------------------------------\n${msg.text}\n================================\n`
    )
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string) {}
  async send(msg: EmailMessage & { from: string }): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: msg.from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Resend API error ${res.status}: ${body.slice(0, 300)}`)
    }
  }
}

function getProvider(): EmailProvider {
  const explicit = process.env.EMAIL_PROVIDER
  if (explicit === 'console') return new ConsoleEmailProvider()
  if (process.env.RESEND_API_KEY) return new ResendEmailProvider(process.env.RESEND_API_KEY)
  return new ConsoleEmailProvider()
}

export type EmailType =
  | 'VERIFICATION'
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'ORDER_CONFIRMATION'
  | 'SHIPPING_NOTIFICATION'
  | 'ORDER_STATUS'
  | 'ABANDONED_CART'
  | 'ADMIN_NEW_ORDER'
  | 'ADMIN_LOW_STOCK'
  | 'ADMIN_PAYMENT_ISSUE'

/** Send an email and record the attempt in EmailEvent. Never throws. */
export async function sendEmail(type: EmailType, msg: EmailMessage, meta?: unknown): Promise<boolean> {
  const settings = await getSettings([
    SETTING_KEYS.EMAIL_SENDER_NAME,
    SETTING_KEYS.EMAIL_SENDER_ADDRESS,
  ])
  const from = `${settings[SETTING_KEYS.EMAIL_SENDER_NAME]} <${settings[SETTING_KEYS.EMAIL_SENDER_ADDRESS]}>`
  try {
    await getProvider().send({ ...msg, from })
    await prisma.emailEvent.create({
      data: {
        toEmail: msg.to,
        type,
        subject: msg.subject,
        status: 'SENT',
        meta: meta === undefined ? null : JSON.stringify(meta),
      },
    })
    return true
  } catch (err) {
    console.error(`email send failed (${type} -> ${msg.to})`, err)
    await prisma.emailEvent
      .create({
        data: {
          toEmail: msg.to,
          type,
          subject: msg.subject,
          status: 'FAILED',
          error: err instanceof Error ? err.message.slice(0, 500) : 'unknown error',
          meta: meta === undefined ? null : JSON.stringify(meta),
        },
      })
      .catch(() => {})
    return false
  }
}
