'use client'

import { useActionState, useState } from 'react'
import { addToCartAction, type CartActionState } from '@/app/actions/cart'

export function AddToCartButton({
  productId,
  disabled,
  disabledLabel = 'Sold Out',
  showQuantity = false,
  maxQuantity = 999,
  className = 'btn btn-gold w-full',
}: {
  productId: string
  disabled?: boolean
  disabledLabel?: string
  showQuantity?: boolean
  maxQuantity?: number
  className?: string
}) {
  const [state, formAction, pending] = useActionState<CartActionState, FormData>(
    addToCartAction,
    {}
  )
  const [quantity, setQuantity] = useState(1)
  const flash = !pending && Boolean(state.success)

  if (disabled) {
    return (
      <button type="button" className={className} disabled>
        {disabledLabel}
      </button>
    )
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="productId" value={productId} />
      <div className={showQuantity ? 'flex items-stretch gap-3' : ''}>
        {showQuantity ? (
          <div className="flex items-center rounded-md border border-line">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="h-full min-h-11 w-11 text-lg text-muted hover:text-fg disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              −
            </button>
            <input
              type="number"
              name="quantity"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value || '1', 10))))
              }
              aria-label="Quantity"
              className="w-12 border-x border-line bg-transparent py-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="Increase quantity"
              className="h-full min-h-11 w-11 text-lg text-muted hover:text-fg disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
            >
              +
            </button>
          </div>
        ) : (
          <input type="hidden" name="quantity" value="1" />
        )}
        <button type="submit" className={className} disabled={pending} aria-busy={pending}>
          {pending ? 'Adding…' : flash ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  )
}
