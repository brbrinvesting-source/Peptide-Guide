import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const { page: pageRaw } = await searchParams
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const perPage = 50

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Audit logs</h1>

      <div className="panel mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>When</th><th>User</th><th>Action</th><th>Object</th><th>Change</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs text-muted">{l.createdAt.toLocaleString('en-US')}</td>
                <td className="max-w-44 truncate text-xs">{l.user?.email ?? 'system'}</td>
                <td className="text-xs font-semibold">{l.action}</td>
                <td className="text-xs text-muted">{l.objectType}{l.objectId ? ` · ${l.objectId.slice(0, 10)}…` : ''}</td>
                <td className="max-w-md">
                  {(l.before || l.after) && (
                    <details>
                      <summary className="cursor-pointer text-xs text-gold">details</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-ink p-2 text-[0.65rem] whitespace-pre-wrap text-muted">
                        {l.before ? `before: ${l.before}\n` : ''}
                        {l.after ? `after: ${l.after}` : ''}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`?page=${page - 1}`} className="btn btn-outline btn-sm">← Prev</Link>}
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?page=${page + 1}`} className="btn btn-outline btn-sm">Next →</Link>}
        </nav>
      )}
    </div>
  )
}
