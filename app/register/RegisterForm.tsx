'use client'

import { useActionState } from 'react'
import { registerAction, type FormState } from '@/app/actions/auth'
import { Alert, SubmitButton } from '@/components/forms'

export function RegisterForm() {
  const [state, formAction] = useActionState<FormState, FormData>(registerAction, {})
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <div>
        <label htmlFor="email" className="microlabel mb-1.5 block">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="you@lab.com" />
      </div>
      <div>
        <label htmlFor="password" className="microlabel mb-1.5 block">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
          placeholder="At least 10 characters"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="microlabel mb-1.5 block">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
          placeholder="Repeat your password"
        />
      </div>
      <SubmitButton pendingLabel="Creating account…">Create Account</SubmitButton>
    </form>
  )
}
