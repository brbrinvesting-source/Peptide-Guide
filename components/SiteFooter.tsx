import Link from 'next/link'
import { getSettings, SETTING_KEYS } from '@/lib/settings'
import { RESEARCH_DISCLAIMER_SHORT } from '@/lib/constants'
import { AAMark, Tagline } from './Logo'

export async function SiteFooter() {
  const settings = await getSettings([
    SETTING_KEYS.STORE_CONTACT_INFO,
    SETTING_KEYS.STORE_CONTACT_EMAIL,
  ])
  const contact = settings[SETTING_KEYS.STORE_CONTACT_INFO]

  const columns: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: 'Shop',
      links: [
        { href: '/catalog', label: 'Catalog' },
        { href: '/coas', label: 'COA & Test Results' },
        { href: '/account', label: 'Account' },
        { href: '/cart', label: 'Cart' },
      ],
    },
    {
      title: 'Support',
      links: [
        { href: '/contact', label: 'Contact' },
        { href: '/legal/shipping-policy', label: 'Shipping Policy' },
        { href: '/legal/refund-policy', label: 'Refund Policy' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { href: '/legal/terms', label: 'Terms & Conditions' },
        { href: '/legal/privacy', label: 'Privacy Policy' },
        { href: '/legal/research-disclaimer', label: 'Research Use Disclaimer' },
      ],
    },
  ]

  return (
    <footer className="mt-auto border-t border-line bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 text-fg">
              <AAMark size={40} />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold tracking-[0.22em]">ALL-ACCESS</span>
                <span className="text-[0.65rem] tracking-[0.42em] text-gold">PEPTIDES</span>
              </span>
            </div>
            <Tagline className="mt-2" />
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted">
              Research compounds with transparent documentation. {RESEARCH_DISCLAIMER_SHORT}
            </p>
            {contact && <p className="mt-4 text-xs text-muted">{contact}</p>}
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="microlabel">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} All-Access Peptides. All rights reserved.
          </p>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted uppercase">
            For research use only — not for human or veterinary consumption
          </p>
        </div>
      </div>
    </footer>
  )
}
