import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { setCoaStatusAction } from '@/app/actions/admin'
import { CoaUploadForm } from './CoaUploadForm'
import { CoaVerifyForm } from './CoaVerifyForm'

export default async function AdminCoasPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>
}) {
  await requireAdmin()
  const { productId = '' } = await searchParams

  const [products, coas] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: { id: true, name: true, vialSize: true, sku: true },
    }),
    prisma.coa.findMany({
      where: productId ? { productId } : {},
      include: { product: true, lot: true, uploadedBy: { select: { email: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    }),
  ])

  const missingCurrent = await prisma.product.count({
    where: { active: true, coas: { none: { isCurrent: true, active: true } } },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">COA management</h1>
      <p className="mt-2 text-xs text-muted">
        {missingCurrent} active product{missingCurrent === 1 ? '' : 's'} without a current COA.
        Replacing a current COA keeps the previous one as historical documentation — nothing is
        destroyed. Only display claims supported by the uploaded document.
      </p>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="panel overflow-x-auto">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="microlabel">Documents</p>
            <form method="GET">
              <select name="productId" defaultValue={productId} className="field max-w-60 py-1.5 text-xs" aria-label="Filter by product" onChange={undefined}>
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.vialSize}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-ghost btn-sm ml-2">Filter</button>
            </form>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Tested</th>
                <th>Laboratory</th>
                <th>COA #</th>
                <th>Lot</th>
                <th>Status</th>
                <th>Purity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coas.map((c) => (
                <tr key={c.id} className={!c.active ? 'opacity-50' : ''}>
                  <td className="font-semibold">{c.product.name} <span className="text-muted">— {c.product.vialSize}</span></td>
                  <td className="text-xs text-muted">{c.testingDate ? c.testingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="text-xs">{c.laboratory ?? '—'}</td>
                  <td className="font-mono text-xs">{c.coaNumber ?? '—'}</td>
                  <td className="font-mono text-xs">{c.lot?.lotNumber ?? '—'}</td>
                  <td>
                    {c.isCurrent ? (
                      <span className="badge badge-gold">Current</span>
                    ) : c.active ? (
                      <span className="badge badge-neutral">Historical</span>
                    ) : (
                      <span className="badge badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    {c.purityVerified ? (
                      <span className="badge badge-gold">
                        Verified{c.purityPercent !== null ? ` ${c.purityPercent}%` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Not verified</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <a href={`/api/coa/${c.id}/file`} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">Preview</a>
                      <a href={`/api/coa/${c.id}/file?download=1`} className="text-muted hover:text-fg">Download</a>
                      {!c.isCurrent && c.active && (
                        <form action={setCoaStatusAction} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="op" value="make-current" />
                          <button type="submit" className="text-muted hover:text-gold">Make current</button>
                        </form>
                      )}
                      {c.active ? (
                        <form action={setCoaStatusAction} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="op" value="deactivate" />
                          <button type="submit" className="text-muted hover:text-danger">Deactivate</button>
                        </form>
                      ) : (
                        <form action={setCoaStatusAction} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="op" value="reactivate" />
                          <button type="submit" className="text-muted hover:text-success">Reactivate</button>
                        </form>
                      )}
                      <details className="inline-block">
                        <summary className="cursor-pointer text-muted hover:text-gold">Verify…</summary>
                        <div className="w-64 py-2">
                          <CoaVerifyForm coaId={c.id} purityVerified={c.purityVerified} purityPercent={c.purityPercent} />
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
              {coas.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted">No COAs uploaded yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel h-fit p-5">
          <p className="microlabel mb-4">Upload COA</p>
          <CoaUploadForm
            products={products.map((p) => ({ id: p.id, label: `${p.name} — ${p.vialSize} (${p.sku})` }))}
            defaultProductId={productId}
          />
        </div>
      </div>
    </div>
  )
}
