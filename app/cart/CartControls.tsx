'use client'

import { useActionState } from 'react'
import {
  applyPromoAction,
  removeItemAction,
  removePromoAction,
  setQuantityAction,
  type CartActionState,
} from '@/app/actions/cart'
import { SubmitButton } from '@/components/forms'

export function CartLineControls({
  productId,
  quantity,
  maxQuantity,
}: {
  productId: string
  quantity: number
  maxQuantity: number
}) {
  const [state, formAction, pending] = useActionState<CartActionState, FormData>(
    setQuantityAction,
    {}
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction} className="flex items-center rounded-md border border-line" aria-label="Change quantity">
        <input type="hidden" name="productId" value={productId} />
        <button
          type="submit"
          name="quantity"
          value={quantity - 1}
          disabled={pending || quantity <= 1}
          aria-label="Decrease quantity"
          className="h-10 w-10 text-lg text-muted hover:text-fg disabled:opacity-40"
        >
          −
        </button>
        <span className="w-10 border-x border-line py-2 text-center text-sm" aria-live="polite">
          {quantity}
        </span>
        <button
          type="submit"
          name="quantity"
          value={quantity + 1}
          disabled={pending || quantity >= maxQuantity}
          aria-label="Increase quantity"
          className="h-10 w-10 text-lg text-muted hover:text-fg disabled:opacity-40"
        >
          +
        </button>
      </form>
      <form action={removeItemAction}>
        <input type="hidden" name="productId" value={productId} />
        <button type="submit" className="text-xs tracking-wide text-muted underline-offset-2 hover:text-danger hover:underline">
          Remove
        </button>
      </form>
      {state.error && (
        <p role="alert" className="w-full text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  )
}

export function PromoForm() {
  const [state, formAction] = useActionState<CartActionState, FormData>(applyPromoAction, {})
  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="promo-code" className="microlabel block">
        Promo code
      </label>
      <div className="flex gap-2">
        <input
          id="promo-code"
          name="code"
          type="text"
          autoComplete="off"
          placeholder="Enter code"
          className="field flex-1 uppercase"
        />
        <SubmitButton className="btn btn-outline btn-sm self-stretch" pendingLabel="…">
          Apply
        </SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  )
}

export function RemovePromoButton() {
  return (
    <form action={removePromoAction} className="inline">
      <button
        type="submit"
        aria-label="Remove promo code"
        className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
      >
        remove
      </button>
    </form>
  )
}
