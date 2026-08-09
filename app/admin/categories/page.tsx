import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CategoryForm } from './CategoryForm'

export default async function AdminCategoriesPage() {
  await requireAdmin()
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Sort</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">
                    <details>
                      <summary className="cursor-pointer">{c.name}</summary>
                      <div className="max-w-xs py-3">
                        <CategoryForm category={{ id: c.id, name: c.name, sortOrder: c.sortOrder, active: c.active }} />
                      </div>
                    </details>
                  </td>
                  <td className="font-mono text-xs text-muted">{c.slug}</td>
                  <td>{c._count.products}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c.active ? <span className="badge badge-instock">Active</span> : <span className="badge badge-neutral">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel h-fit p-5">
          <p className="microlabel mb-4">Add category</p>
          <CategoryForm category={null} />
        </div>
      </div>
    </div>
  )
}
