'use client'

import { useActionState } from 'react'
import { adjustInventoryAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

const REASONS = [
  ['INITIAL', 'Initial inventory'],
  ['RESTOCK', 'Restock'],
  ['MANUAL_CORRECTION', 'Manual correction'],
  ['DAMAGED', 'Damaged'],
  ['LOST', 'Lost'],
  ['OTHER', 'Other'],
]

export function InventoryAdjustForm({ productId, currentQty }: { productId: string; currentQty: number }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(adjustInventoryAction, {})
  return (
    <form action={formAction} className="space-y-2.5">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <input type="hidden" name="productId" value={productId} />
      <label className="microlabel block">
        New quantity (current: {currentQty})
        <input name="newQty" inputMode="numeric" required defaultValue={currentQty} className="field mt-1.5" />
      </label>
      <label className="microlabel block">
        Reason
        <select name="reason" required className="field mt-1.5" defaultValue="RESTOCK">
          {REASONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <input name="note" placeholder="Note (optional)" aria-label="Note" className="field" />
      <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Saving…">
        Apply
      </SubmitButton>
    </form>
  )
}
