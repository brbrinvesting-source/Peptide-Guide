'use client'

import { useActionState, useState } from 'react'
import { savePromoAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export interface PromoFormData {
  id: string
  code: string
  description: string
  discountType: string
  discountValue: string
  startsAt: string
  expiresAt: string
  minSubtotal: string
  maxTotalUses: string
  perCustomerLimit: string
  active: boolean
}

export function PromoForm({ promo }: { promo: PromoFormData | null }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(savePromoAction, {})
  const [type, setType] = useState(promo?.discountType ?? 'PERCENT')

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      {promo && <input type="hidden" name="id" value={promo.id} />}
      <label className="microlabel block">
        Code
        <input name="code" required defaultValue={promo?.code} placeholder="SPRING10" className="field mt-1.5 font-mono uppercase" />
      </label>
      <label className="microlabel block">
        Description
        <input name="description" defaultValue={promo?.description} className="field mt-1.5" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="microlabel block">
          Type
          <select name="discountType" value={type} onChange={(e) => setType(e.target.value)} className="field mt-1.5">
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Dollars off</option>
          </select>
        </label>
        <label className="microlabel block">
          {type === 'PERCENT' ? 'Percent (1–100)' : 'Amount (USD)'}
          <input name="discountValue" required inputMode="decimal" defaultValue={promo?.discountValue} className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          Starts
          <input type="date" name="startsAt" defaultValue={promo?.startsAt} className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          Expires
          <input type="date" name="expiresAt" defaultValue={promo?.expiresAt} className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          Min purchase (USD)
          <input name="minSubtotal" inputMode="decimal" defaultValue={promo?.minSubtotal} placeholder="none" className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          Max total uses
          <input name="maxTotalUses" inputMode="numeric" defaultValue={promo?.maxTotalUses} placeholder="unlimited" className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          Per-customer limit
          <input name="perCustomerLimit" inputMode="numeric" defaultValue={promo?.perCustomerLimit} placeholder="unlimited" className="field mt-1.5" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={promo?.active ?? true} className="h-4 w-4 accent-[#c9a961]" /> Active
      </label>
      <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Saving…">
        {promo ? 'Save Code' : 'Create Code'}
      </SubmitButton>
    </form>
  )
}
