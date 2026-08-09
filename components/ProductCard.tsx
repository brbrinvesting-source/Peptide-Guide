import Link from 'next/link'
import { formatCents, stockStatus, STOCK_LABELS } from '@/lib/constants'
import type { BulkTier } from '@/lib/settings'
import { VialImage } from './VialImage'
import { AddToCartButton } from './AddToCartButton'

export interface CatalogProduct {
  id: string
  name: string
  slug: string
  sku: string
  vialSize: string
  priceCents: number | null
  inventoryQty: number
  lowStockThreshold: number
  coaComingSoon: boolean
  imageUrl: string | null
  imageAlt: string | null
  hasCurrentCoa: boolean
  currentCoaId: string | null
  purityVerified: boolean
  purityPercent: number | null
}

const BADGE_CLASS = {
  IN_STOCK: 'badge badge-instock',
  LOW_STOCK: 'badge badge-lowstock',
  SOLD_OUT: 'badge badge-soldout',
} as const

export function ProductCard({ product, bulkTiers }: { product: CatalogProduct; bulkTiers: BulkTier[] }) {
  const status = stockStatus(product.inventoryQty, product.lowStockThreshold)
  const purchasable = product.priceCents !== null && status !== 'SOLD_OUT'
  const bestTier = bulkTiers.length > 0 ? bulkTiers[bulkTiers.length - 1] : null

  return (
    <article className="panel group flex flex-col overflow-hidden transition-colors hover:border-line-strong">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden border-b border-line"
        aria-label={`View ${product.name} ${product.vialSize}`}
      >
        <VialImage
          name={product.name}
          vialSize={product.vialSize}
          imageUrl={product.imageUrl}
          alt={product.imageAlt}
        />
        <span className={`absolute top-3 left-3 ${BADGE_CLASS[status]} bg-ink/80`}>
          {STOCK_LABELS[status]}
        </span>
        {product.purityVerified && (
          <span className="badge badge-gold absolute top-3 right-3 bg-ink/80">
            Verified{product.purityPercent !== null ? ` ${product.purityPercent}%` : ''}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link href={`/products/${product.slug}`} className="block">
            <h3 className="text-sm leading-snug font-semibold tracking-wide">{product.name}</h3>
          </Link>
          <p className="mt-1 text-xs tracking-[0.14em] text-muted uppercase">{product.vialSize}</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-lg font-bold">
              {product.priceCents !== null ? formatCents(product.priceCents) : 'Coming soon'}
            </p>
            {product.priceCents !== null && bulkTiers.length > 0 && bestTier && (
              <p className="text-[0.65rem] tracking-wide text-gold" title="Automatic bulk pricing">
                Save up to {bestTier.percentOff}% in bulk
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <AddToCartButton
            productId={product.id}
            disabled={!purchasable}
            disabledLabel={product.priceCents === null ? 'Coming Soon' : 'Sold Out'}
          />
          {product.hasCurrentCoa ? (
            <Link
              href={`/coas/${product.currentCoaId}`}
              className="btn btn-outline btn-sm w-full"
              prefetch={false}
            >
              View COA
            </Link>
          ) : product.coaComingSoon ? (
            <p className="py-1 text-center text-[0.65rem] tracking-[0.18em] text-muted uppercase">
              COA coming soon
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
