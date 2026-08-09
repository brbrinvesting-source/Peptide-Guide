'use client'

import { useActionState } from 'react'
import { updateCoaVerificationAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export function CoaVerifyForm({
  coaId,
  purityVerified,
  purityPercent,
}: {
  coaId: string
  purityVerified: boolean
  purityPercent: number | null
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(
    updateCoaVerificationAction,
    {}
  )
  return (
    <form action={formAction} className="space-y-2.5">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <input type="hidden" name="id" value={coaId} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="purityVerified"
          defaultChecked={purityVerified}
          className="h-4 w-4 accent-[#c9a961]"
        />
        Verified Purity badge live on storefront
      </label>
      <label className="microlabel block">
        Purity % documented in this COA
        <input
          name="purityPercent"
          inputMode="decimal"
          defaultValue={purityPercent ?? ''}
          placeholder="e.g. 99.1"
          className="field mt-1.5"
        />
      </label>
      <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Saving…">
        Save Verification
      </SubmitButton>
    </form>
  )
}
