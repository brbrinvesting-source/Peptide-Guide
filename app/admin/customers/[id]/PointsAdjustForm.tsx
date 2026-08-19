'use client'

import { useActionState } from 'react'
import { adjustPointsAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export function PointsAdjustForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(adjustPointsAction, {})
  return (
    <form action={formAction} className="mt-3 space-y-2">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <input
          name="points"
          inputMode="numeric"
          placeholder="e.g. 500 or -200"
          aria-label="Point adjustment"
          className="field w-32"
        />
        <input name="note" placeholder="Reason (optional)" aria-label="Reason" className="field flex-1" />
        <SubmitButton className="btn btn-outline btn-sm shrink-0" pendingLabel="…">
          Adjust
        </SubmitButton>
      </div>
    </form>
  )
}
