'use client'

import { useActionState } from 'react'
import { setUserRoleAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export function RoleForm() {
  const [state, formAction] = useActionState<AdminActionState, FormData>(setUserRoleAction, {})
  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <label className="microlabel block">
        Account email
        <input name="email" type="email" required className="field mt-1.5" placeholder="user@example.com" />
      </label>
      <label className="microlabel block">
        Role
        <select name="role" className="field mt-1.5" defaultValue="ADMIN">
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="CUSTOMER">Customer (remove admin access)</option>
        </select>
      </label>
      <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Saving…">
        Apply Role
      </SubmitButton>
      <p className="text-[0.65rem] leading-relaxed text-muted">
        The account must already exist (the user registers normally first).
      </p>
    </form>
  )
}
