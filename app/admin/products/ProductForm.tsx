'use client'

import { useActionState } from 'react'
import { saveProductAction, setProductImageAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export interface ProductFormData {
  id?: string
  name: string
  sku: string
  vialSize: string
  categoryId: string
  priceDollars: string
  weightOz: number
  inventoryQty?: number
  lowStockThreshold: number
  sortOrder: number
  description: string
  specifications: string
  active: boolean
  featured: boolean
  coaComingSoon: boolean
  imageUrl?: string | null
}

export function ProductForm({
  product,
  categories,
}: {
  product: ProductFormData | null
  categories: { id: string; name: string }[]
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(saveProductAction, {})
  const [imgState, imgAction] = useActionState<AdminActionState, FormData>(setProductImageAction, {})
  const isNew = !product?.id

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form action={formAction} className="panel space-y-4 p-5">
        {state.error && <Alert kind="error">{state.error}</Alert>}
        {state.success && <Alert kind="success">{state.success}</Alert>}
        {product?.id && <input type="hidden" name="id" value={product.id} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="microlabel mb-1.5 block">Product name *</label>
            <input id="name" name="name" required defaultValue={product?.name} className="field" />
          </div>
          <div>
            <label htmlFor="sku" className="microlabel mb-1.5 block">SKU *</label>
            <input id="sku" name="sku" required defaultValue={product?.sku} className="field font-mono" />
          </div>
          <div>
            <label htmlFor="vialSize" className="microlabel mb-1.5 block">Vial size *</label>
            <input id="vialSize" name="vialSize" required defaultValue={product?.vialSize} placeholder="10 mg" className="field" />
          </div>
          <div>
            <label htmlFor="categoryId" className="microlabel mb-1.5 block">Category *</label>
            <select id="categoryId" name="categoryId" required defaultValue={product?.categoryId ?? ''} className="field">
              <option value="" disabled>Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="microlabel mb-1.5 block">Price (USD)</label>
            <input id="price" name="price" inputMode="decimal" defaultValue={product?.priceDollars} placeholder="Leave empty = not purchasable" className="field" />
          </div>
          <div>
            <label htmlFor="weightOz" className="microlabel mb-1.5 block">Shipping weight (oz)</label>
            <input id="weightOz" name="weightOz" inputMode="decimal" defaultValue={product?.weightOz ?? 4} placeholder="4" className="field" />
          </div>
          {isNew && (
            <div>
              <label htmlFor="initialInventory" className="microlabel mb-1.5 block">Initial inventory</label>
              <input id="initialInventory" name="initialInventory" inputMode="numeric" placeholder="0" className="field" />
            </div>
          )}
          <div>
            <label htmlFor="lowStockThreshold" className="microlabel mb-1.5 block">Low-stock threshold</label>
            <input id="lowStockThreshold" name="lowStockThreshold" inputMode="numeric" defaultValue={product?.lowStockThreshold ?? 5} className="field" />
          </div>
          <div>
            <label htmlFor="sortOrder" className="microlabel mb-1.5 block">Sort order</label>
            <input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={product?.sortOrder ?? 0} className="field" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="microlabel mb-1.5 block">Description</label>
          <textarea id="description" name="description" rows={5} defaultValue={product?.description} className="field" placeholder="Factual, research-oriented product information. No medical, efficacy, dosing, titration, or human-use content of any kind." />
          <p className="mt-1.5 text-[0.65rem] leading-relaxed text-danger/90">
            Do not enter dosing, titration, reconstitution, or administration instructions, or any
            language suggesting human or veterinary use — research use only.
          </p>
        </div>
        <div>
          <label htmlFor="specifications" className="microlabel mb-1.5 block">Specifications (one per line, &quot;Label: value&quot;)</label>
          <textarea id="specifications" name="specifications" rows={5} defaultValue={product?.specifications} className="field font-mono text-xs" placeholder={'Form: Lyophilized powder\nStorage: See documentation'} />
        </div>

        <div className="flex flex-wrap gap-5 pt-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-[#c9a961]" /> Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-[#c9a961]" /> Featured on homepage</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="coaComingSoon" defaultChecked={product?.coaComingSoon ?? false} className="h-4 w-4 accent-[#c9a961]" /> Show &quot;COA coming soon&quot;</label>
        </div>

        <SubmitButton className="btn btn-gold" pendingLabel="Saving…">
          {isNew ? 'Create Product' : 'Save Product'}
        </SubmitButton>
        <p className="text-xs text-muted">
          Products with order history should be deactivated, not deleted — historical orders always
          remain intact.
        </p>
      </form>

      {!isNew && (
        <form action={imgAction} className="panel h-fit space-y-4 p-5">
          <p className="microlabel">Primary image</p>
          {imgState.error && <Alert kind="error">{imgState.error}</Alert>}
          {imgState.success && <Alert kind="success">{imgState.success}</Alert>}
          <input type="hidden" name="productId" value={product!.id} />
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="Current product" className="aspect-square w-full rounded-md border border-line object-cover" />
          ) : (
            <p className="text-xs text-muted">
              No image uploaded — the storefront shows the branded vial placeholder.
            </p>
          )}
          <div>
            <label htmlFor="imageFile" className="microlabel mb-1.5 block">Upload image</label>
            <input id="imageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="field" />
          </div>
          <div>
            <label htmlFor="imageUrl" className="microlabel mb-1.5 block">…or image URL</label>
            <input id="imageUrl" name="imageUrl" type="url" placeholder="https://…" className="field" />
          </div>
          <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Uploading…">
            Set Image
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
