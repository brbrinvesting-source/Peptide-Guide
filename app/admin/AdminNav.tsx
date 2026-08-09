'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS: { href: string; label: string; superOnly?: boolean }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/promos', label: 'Promo Codes' },
  { href: '/admin/welcome-promos', label: 'Welcome Promos' },
  { href: '/admin/coas', label: 'COA Management' },
  { href: '/admin/emails', label: 'Email Log' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/users', label: 'Admin Users', superOnly: true },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
]

export function AdminNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin navigation" className="mt-4">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.filter((l) => !l.superOnly || isSuperAdmin).map((l) => {
          const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                className={`block rounded-md px-3 py-2 text-xs font-medium tracking-[0.1em] whitespace-nowrap uppercase transition-colors ${
                  active ? 'bg-gold/10 text-gold' : 'text-muted hover:bg-panel hover:text-fg'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
