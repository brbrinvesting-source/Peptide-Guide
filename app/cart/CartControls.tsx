'use client'

import { useActionState, useState, useTransition } from 'react'
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
  const [draft, setDraft] = useState(String(quantity))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Resync the draft once the server confirms a new quantity (e.g. after a
  // commit, or if another tab/device changed the cart) — adjusted during
  // render rather than an effect, per React's guidance for derived state.
  const [prevQuantity, setPrevQuantity] = useState(quantity)
  if (quantity !== prevQuantity) {
    setPrevQuantity(quantity)
    setDraft(String(quantity))
  }

  function commit(nextRaw: number) {
    if (!Number.isFinite(nextRaw)) {
      setDraft(String(quantity))
      return
    }
    const next = Math.min(Math.max(Math.round(nextRaw), 1), maxQuantity)
    setDraft(String(next))
    if (next === quantity) return
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('productId', productId)
      fd.set('quantity', String(next))
      const result = await setQuantityAction({}, fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-md border border-line" aria-label="Change quantity">
        <button
          type="button"
          onClick={() => commit(quantity - 1)}
          disabled={isPending || quantity <= 1}
          aria-label="Decrease quantity"
          className="h-10 w-10 text-lg text-muted hover:text-fg disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => commit(parseInt(draft, 10))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(parseInt(draft, 10))
              e.currentTarget.blur()
            }
          }}
          disabled={isPending}
          min={1}
          max={maxQuantity}
          aria-label="Quantity"
          className="w-14 border-x border-line bg-transparent py-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => commit(quantity + 1)}
          disabled={isPending || quantity >= maxQuantity}
          aria-label="Increase quantity"
          className="h-10 w-10 text-lg text-muted hover:text-fg disabled:opacity-40"
        >
          +
        </button>
      </div>
      <form action={removeItemAction}>
        <input type="hidden" name="productId" value={productId} />
        <button type="submit" className="text-xs tracking-wide text-muted underline-offset-2 hover:text-danger hover:underline">
          Remove
        </button>
      </form>
      {error && (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
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
