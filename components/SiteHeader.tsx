import Link from 'next/link'
import { getCurrentUser, isAdminRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Logo } from './Logo'
import { MobileNav, type NavLink } from './MobileNav'

async function cartCount(userId: string): Promise<number> {
  const items = await prisma.cartItem.findMany({
    where: { cart: { userId, status: { in: ['ACTIVE', 'ABANDONED_NOTIFIED'] } } },
    select: { quantity: true },
  })
  return items.reduce((s, i) => s + i.quantity, 0)
}

export async function SiteHeader() {
  const user = await getCurrentUser()
  const count = user ? await cartCount(user.id) : 0
  const authed = Boolean(user?.emailVerified)

  const links: NavLink[] = authed
    ? [
        { href: '/catalog', label: 'Catalog' },
        { href: '/coas', label: 'COA & Test Results' },
        { href: '/account', label: 'Account' },
        { href: '/contact', label: 'Contact' },
      ]
    : [
        { href: '/login', label: 'Log In' },
        { href: '/register', label: 'Create Account' },
        { href: '/contact', label: 'Contact' },
      ]
  if (user && isAdminRole(user.role)) links.push({ href: '/admin', label: 'Admin' })

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-medium tracking-[0.18em] text-muted uppercase transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {authed && (
            <Link
              href="/catalog"
              aria-label="Search the catalog"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:text-fg"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </Link>
          )}
          {authed ? (
            <Link
              href="/cart"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:text-fg"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M3 4h2l1.6 9.5a1 1 0 001 .83h7.3a1 1 0 00.98-.8L17.5 7H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="8.5" cy="17" r="1" fill="currentColor" />
                <circle cx="14.5" cy="17" r="1" fill="currentColor" />
              </svg>
              {count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[0.6rem] font-bold text-ink">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-outline btn-sm hidden sm:inline-flex">
              Log In
            </Link>
          )}
          <MobileNav links={authed ? [...links, { href: '/cart', label: 'Cart' }] : links} />
        </div>
      </div>
    </header>
  )
}
