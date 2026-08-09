'use client'

import { useActionState } from 'react'
import { forgotPasswordAction, type FormState } from '@/app/actions/auth'
import { Alert, SubmitButton } from '@/components/forms'

export function ForgotForm() {
  const [state, formAction] = useActionState<FormState, FormData>(forgotPasswordAction, {})
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <div>
        <label htmlFor="email" className="microlabel mb-1.5 block">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <SubmitButton pendingLabel="Sending…">Send Reset Link</SubmitButton>
    </form>
  )
}
