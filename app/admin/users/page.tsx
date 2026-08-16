import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RoleForm } from './RoleForm'
import { formatDate } from '@/lib/dates'

export default async function AdminUsersPage() {
  await requireAdmin('SUPER_ADMIN')
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Admin users &amp; roles</h1>
      <p className="mt-2 text-xs text-muted">
        SUPER ADMIN: full access including settings and roles. ADMIN: products, inventory, orders,
        customers, promos, COAs, analytics. The role system supports adding future roles
        (fulfillment, support, inventory manager) without restructuring.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Created</th><th>Status</th></tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.email}</td>
                  <td>
                    <span className={`badge ${a.role === 'SUPER_ADMIN' ? 'badge-gold' : 'badge-neutral'}`}>
                      {a.role.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{formatDate(a.createdAt)}</td>
                  <td className="text-xs">{a.disabled ? 'disabled' : 'active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel h-fit p-5">
          <p className="microlabel mb-4">Change a user&apos;s role</p>
          <RoleForm />
        </div>
      </div>
    </div>
  )
}
