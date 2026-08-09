import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { AdminNav } from './AdminNav'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin — All-Access Peptides' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="microlabel text-gold">Admin</p>
            <p className="mt-1 truncate text-xs text-muted">{admin.email}</p>
          </div>
          <Link href="/" className="text-xs text-muted hover:text-fg lg:mt-3 lg:block">
            ← Storefront
          </Link>
        </div>
        <AdminNav isSuperAdmin={admin.role === 'SUPER_ADMIN'} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
