'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavLink {
  href: string
  label: string
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-line text-fg"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
          {open ? (
            <path d="M2 2l14 10M16 2L2 12" stroke="currentColor" strokeWidth="1.5" />
          ) : (
            <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.5" />
          )}
        </svg>
      </button>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-ink/98 backdrop-blur"
        >
          <ul className="mx-auto max-w-6xl px-4 py-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-line/50 py-3.5 text-sm tracking-[0.14em] uppercase last:border-0 ${
                    pathname === l.href ? 'text-gold' : 'text-fg'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
