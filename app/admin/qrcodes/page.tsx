import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function AdminQrCodesPage() {
  await requireAdmin()

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: {
      category: true,
      coas: { where: { isCurrent: true, active: true }, select: { id: true } },
    },
  })

  const categories = Array.from(new Set(products.map((p) => p.category.name)))

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">QR codes</h1>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
        One code per product, for printing on vial labels. Each scans to a public certificate
        lookup page (no account required) showing that product&apos;s current lot and COA — the
        page updates automatically whenever a new COA is uploaded for that product, so the same
        printed label keeps working after a lot changes. Products flagged{' '}
        <span className="text-danger">no COA yet</span> will show &quot;not yet available&quot;
        until one is uploaded in COA Management.
      </p>

      {categories.map((catName) => (
        <section key={catName} className="mt-8">
          <p className="microlabel text-gold">{catName}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products
              .filter((p) => p.category.name === catName)
              .map((p) => (
                <div key={p.id} className="panel flex flex-col items-center gap-2 p-4 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/qrcode/${p.id}?format=png`}
                    alt={`QR code for ${p.name} ${p.vialSize}`}
                    width={120}
                    height={120}
                    className="rounded bg-white p-1.5"
                  />
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{p.vialSize}</p>
                    <p className="font-mono text-[0.65rem] text-muted">{p.sku}</p>
                    {p.coas.length === 0 && (
                      <p className="mt-1 text-[0.65rem] text-danger">no COA yet</p>
                    )}
                  </div>
                  <div className="flex gap-2 text-[0.65rem]">
                    <a
                      href={`/api/admin/qrcode/${p.id}?format=png&download=1`}
                      className="text-gold hover:text-gold-bright"
                    >
                      PNG
                    </a>
                    <a
                      href={`/api/admin/qrcode/${p.id}?format=svg&download=1`}
                      className="text-gold hover:text-gold-bright"
                    >
                      SVG
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
