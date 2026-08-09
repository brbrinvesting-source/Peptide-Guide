import type { Metadata } from 'next'
import { getSettings, SETTING_KEYS } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact All-Access Peptides support.',
}

export default async function ContactPage() {
  const settings = await getSettings([
    SETTING_KEYS.STORE_CONTACT_EMAIL,
    SETTING_KEYS.STORE_CONTACT_INFO,
  ])
  const email = settings[SETTING_KEYS.STORE_CONTACT_EMAIL]
  const info = settings[SETTING_KEYS.STORE_CONTACT_INFO]

  return (
    <div className="hex-texture">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="microlabel text-gold">Support</p>
        <h1 className="gold-keyline mt-2 text-3xl font-bold tracking-tight">Contact</h1>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="panel p-6">
            <h2 className="microlabel">Email</h2>
            <a href={`mailto:${email}`} className="mt-3 block text-lg font-semibold text-gold hover:text-gold-bright">
              {email}
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Order questions, documentation requests, account help — we typically respond within
              one business day.
            </p>
          </div>
          <div className="panel p-6">
            <h2 className="microlabel">Details</h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-fg/90">{info}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Include your order number for the fastest response on order-related questions.
            </p>
          </div>
        </div>
        <p className="mt-10 text-xs leading-relaxed text-muted">
          All products are for research use only — not for human or veterinary consumption. Our
          team cannot provide dosing, administration, or medical guidance of any kind.
        </p>
      </div>
    </div>
  )
}
