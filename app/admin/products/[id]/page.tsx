import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProductForm } from '../ProductForm'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: [{ isPrimary: 'desc' }], take: 1 } },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  if (!product) notFound()

  return (
    <div>
      <nav className="text-xs text-muted">
        <Link href="/admin/products" className="hover:text-fg">Products</Link>
        <span className="mx-2">/</span>
        {product.sku}
      </nav>
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {product.name} <span className="text-muted">— {product.vialSize}</span>
        </h1>
        <div className="flex gap-2">
          <Link href={`/products/${product.slug}`} className="btn btn-ghost btn-sm">View in store</Link>
          <Link href={`/admin/inventory?q=${encodeURIComponent(product.sku)}`} className="btn btn-outline btn-sm">Inventory</Link>
          <Link href={`/admin/coas?productId=${product.id}`} className="btn btn-outline btn-sm">COAs</Link>
        </div>
      </div>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          vialSize: product.vialSize,
          categoryId: product.categoryId,
          priceDollars: product.priceCents !== null ? (product.priceCents / 100).toFixed(2) : '',
          weightOz: product.weightOz,
          lowStockThreshold: product.lowStockThreshold,
          sortOrder: product.sortOrder,
          description: product.description ?? '',
          specifications: product.specifications ?? '',
          active: product.active,
          featured: product.featured,
          coaComingSoon: product.coaComingSoon,
          imageUrl: product.images[0]?.url ?? null,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
