import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { loadActiveCart, priceCart } from '@/lib/cart'
import { formatCents } from '@/lib/constants'
import { VialImage } from '@/components/VialImage'
import { CartLineControls, PromoForm, RemovePromoButton } from './CartControls'

export const metadata: Metadata = { title: 'Cart', robots: { index: false, follow: false } }

export default async function CartPage() {
  const user = await requireUser()
  const cart = await loadActiveCart(user.id)
  const pricing = cart ? await priceCart(cart) : null

  if (!cart || !pricing || pricing.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted">Browse the catalog to add research compounds.</p>
        <Link href="/catalog" className="btn btn-gold mt-8">
          Browse Catalog
        </Link>
      </div>
    )
  }

  const p = pricing

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="gold-keyline text-3xl font-bold tracking-tight">Cart</h1>

      {/* Cart problems (sold out / reduced stock) */}
      {p.problems.length > 0 && (
        <div role="alert" className="mt-6 space-y-2 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {p.problems.map((prob) => (
            <p key={prob.productId}>
              {prob.kind === 'INSUFFICIENT_STOCK'
                ? `${prob.name}: only ${prob.availableQty} unit${prob.availableQty === 1 ? '' : 's'} available — reduce the quantity to continue.`
                : `${prob.name} is no longer available — remove it to continue.`}
            </p>
          ))}
        </div>
      )}

      {/* Free shipping progress */}
      <div className="panel mt-6 p-4">
        {p.freeShippingQualified ? (
          <p className="text-sm font-semibold tracking-[0.12em] text-gold uppercase">
            ✓ Free shipping unlocked
          </p>
        ) : (
          <>
            <p className="text-sm">
              <span className="font-bold text-gold">{formatCents(p.freeShippingRemainingCents)}</span>{' '}
              away from <span className="font-semibold tracking-wide uppercase">free shipping</span>
            </p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line" role="progressbar"
              aria-valuemin={0} aria-valuemax={p.freeShippingThresholdCents} aria-valuenow={p.merchandiseTotalCents}
              aria-label="Progress toward free shipping">
              <div
                className="h-full bg-gold transition-all"
                style={{ width: `${Math.min(100, (p.merchandiseTotalCents / p.freeShippingThresholdCents) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Lines */}
        <ul className="space-y-3">
          {p.lines.map((line) => (
            <li key={line.productId} className="panel flex gap-4 p-4">
              <Link href={`/products/${line.slug}`} className="block h-24 w-24 shrink-0 overflow-hidden rounded-md border border-line">
                <VialImage name={line.name} vialSize={line.vialSize} imageUrl={line.imageUrl} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/products/${line.slug}`} className="block truncate text-sm font-semibold">
                      {line.name}
                    </Link>
                    <p className="mt-0.5 text-xs tracking-[0.14em] text-muted uppercase">{line.vialSize}</p>
                    {line.bulkDiscountPct > 0 && (
                      <p className="mt-1 text-xs text-gold">
                        Bulk pricing: {line.bulkDiscountPct}% off — {formatCents(line.effectiveUnitCents)}/unit
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold">{formatCents(line.lineTotalCents)}</p>
                </div>
                <CartLineControls
                  productId={line.productId}
                  quantity={line.quantity}
                  maxQuantity={line.availableQty}
                />
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside aria-label="Order summary">
          <div className="panel sticky top-20 p-5">
            <h2 className="microlabel">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatCents(p.subtotalCents)}</dd>
              </div>
              {p.bulkDiscountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Bulk discount</dt>
                  <dd className="text-gold">−{formatCents(p.bulkDiscountCents)}</dd>
                </div>
              )}
              {p.promo && !p.promo.error && p.promoDiscountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">
                    Promo <span className="text-gold">{p.promo.code}</span>
                  </dt>
                  <dd className="flex items-center gap-2 text-gold">
                    −{formatCents(p.promoDiscountCents)}
                    <RemovePromoButton />
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="text-muted">{p.freeShippingQualified ? 'FREE' : 'Calculated at checkout'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd className="text-muted">Calculated at checkout</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatCents(p.merchandiseTotalCents)}</dd>
              </div>
            </dl>

            {p.promo?.error && (
              <p role="alert" className="mt-3 flex items-center justify-between gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {p.promo.code}: {p.promo.error} <RemovePromoButton />
              </p>
            )}
            {!p.promo && (
              <div className="mt-4">
                <PromoForm />
              </div>
            )}

            <Link
              href="/checkout"
              aria-disabled={p.problems.length > 0}
              className={`btn btn-gold mt-5 w-full ${p.problems.length > 0 ? 'pointer-events-none opacity-45' : ''}`}
            >
              Checkout
            </Link>
            <p className="mt-3 text-center text-[0.65rem] leading-relaxed text-muted">
              One promo code per order. Bulk discounts apply automatically and stack with your promo
              code.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
