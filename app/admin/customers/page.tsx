import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCents } from '@/lib/constants'
import type { Prisma } from '@prisma/client'

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireAdmin()
  const { q = '', page: pageRaw } = await searchParams
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const perPage = 50

  const where: Prisma.UserWhereInput = { role: 'CUSTOMER' }
  if (q.trim()) {
    where.OR = [
      { email: { contains: q.trim() } },
      { firstName: { contains: q.trim() } },
      { lastName: { contains: q.trim() } },
    ]
  }

  const [total, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        orders: { where: { paymentStatus: 'PAID' }, select: { totalCents: true } },
      },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Customers</h1>

      <form method="GET" className="mt-5 flex gap-2">
        <input type="search" name="q" defaultValue={q} placeholder="Search email or name…" className="field max-w-xs" aria-label="Search customers" />
        <button type="submit" className="btn btn-outline btn-sm">Search</button>
      </form>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Joined</th>
              <th>Verified</th>
              <th>Paid orders</th>
              <th>Total spend</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="font-semibold hover:text-gold">{c.email}</Link>
                </td>
                <td className="text-muted">{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</td>
                <td className="whitespace-nowrap text-xs text-muted">{c.createdAt.toLocaleDateString('en-US')}</td>
                <td>{c.emailVerified ? <span className="text-success">✓</span> : <span className="text-muted">—</span>}</td>
                <td>{c.orders.length}</td>
                <td className="font-semibold">{formatCents(c.orders.reduce((s, o) => s + o.totalCents, 0))}</td>
                <td>{c.disabled ? <span className="badge badge-danger">Disabled</span> : <span className="badge badge-instock">Active</span>}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`?q=${q}&page=${page - 1}`} className="btn btn-outline btn-sm">← Prev</Link>}
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?q=${q}&page=${page + 1}`} className="btn btn-outline btn-sm">Next →</Link>}
        </nav>
      )}
    </div>
  )
}
