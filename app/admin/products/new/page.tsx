import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProductForm } from '../ProductForm'

export default async function NewProductPage() {
  await requireAdmin()
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })
  return (
    <div>
      <nav className="text-xs text-muted">
        <Link href="/admin/products" className="hover:text-fg">Products</Link>
        <span className="mx-2">/</span>New
      </nav>
      <h1 className="mt-2 mb-5 text-2xl font-bold tracking-tight">Add product</h1>
      <ProductForm product={null} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  )
}
