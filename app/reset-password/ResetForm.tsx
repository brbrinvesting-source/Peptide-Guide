'use client'

import { useActionState } from 'react'
import { resetPasswordAction, type FormState } from '@/app/actions/auth'
import { Alert, SubmitButton } from '@/components/forms'

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(resetPasswordAction, {})
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="microlabel mb-1.5 block">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="microlabel mb-1.5 block">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
      </div>
      <SubmitButton pendingLabel="Saving…">Set New Password</SubmitButton>
    </form>
  )
}
