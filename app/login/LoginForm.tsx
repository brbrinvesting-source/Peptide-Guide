'use client'

import { useActionState } from 'react'
import { loginAction, type FormState } from '@/app/actions/auth'
import { Alert, SubmitButton } from '@/components/forms'

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(loginAction, {})
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="microlabel mb-1.5 block">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
          placeholder="you@lab.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="microlabel mb-1.5 block">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          placeholder="••••••••••"
        />
      </div>
      <SubmitButton pendingLabel="Logging in…">Log In</SubmitButton>
    </form>
  )
}
