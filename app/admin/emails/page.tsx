import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { formatDateTime } from '@/lib/dates'

const TYPES = [
  'VERIFICATION', 'WELCOME', 'PASSWORD_RESET', 'ORDER_CONFIRMATION', 'SHIPPING_NOTIFICATION',
  'ORDER_STATUS', 'ABANDONED_CART', 'ADMIN_NEW_ORDER', 'ADMIN_LOW_STOCK', 'ADMIN_PAYMENT_ISSUE',
]

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  await requireAdmin()
  const { type = '', page: pageRaw } = await searchParams
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const perPage = 50
  const where: Prisma.EmailEventWhereInput = type ? { type } : {}

  const [total, events] = await Promise.all([
    prisma.emailEvent.count({ where }),
    prisma.emailEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Email log</h1>
      <p className="mt-2 text-xs text-muted">
        Every transactional email attempt. Sender identity, abandoned-cart timing and subject are
        configured in <Link href="/admin/settings" className="text-gold">Settings</Link>.
      </p>

      <form method="GET" className="mt-5 flex gap-2">
        <select name="type" defaultValue={type} className="field max-w-60" aria-label="Filter by email type">
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-outline btn-sm">Filter</button>
      </form>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>When</th><th>Type</th><th>To</th><th>Subject</th><th>Status</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs text-muted">{formatDateTime(e.createdAt)}</td>
                <td className="text-xs">{e.type.replaceAll('_', ' ')}</td>
                <td className="max-w-52 truncate text-muted">{e.toEmail}</td>
                <td className="max-w-72 truncate">{e.subject}</td>
                <td>
                  {e.status === 'SENT' ? (
                    <span className="badge badge-instock">Sent</span>
                  ) : (
                    <span className="badge badge-danger" title={e.error ?? ''}>Failed</span>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No email events.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`?type=${type}&page=${page - 1}`} className="btn btn-outline btn-sm">← Prev</Link>}
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?type=${type}&page=${page + 1}`} className="btn btn-outline btn-sm">Next →</Link>}
        </nav>
      )}
    </div>
  )
}
