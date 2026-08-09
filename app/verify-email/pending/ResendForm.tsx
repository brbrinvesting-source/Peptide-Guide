'use client'

import { useActionState } from 'react'
import { resendVerificationAction, type FormState } from '@/app/actions/auth'
import { Alert, SubmitButton } from '@/components/forms'

export function ResendForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    async (prev) => resendVerificationAction(),
    {}
  )
  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <SubmitButton className="btn btn-outline w-full" pendingLabel="Sending…">
        Resend Verification Email
      </SubmitButton>
    </form>
  )
}
