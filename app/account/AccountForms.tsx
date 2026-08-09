'use client'

import { useActionState } from 'react'
import { changePasswordAction, updateAccountAction, type FormState } from '@/app/actions/auth'
import { Alert, SubmitButton } from '@/components/forms'

export function AccountForms({
  email,
  firstName,
  lastName,
  marketingOptOut,
}: {
  email: string
  firstName: string
  lastName: string
  marketingOptOut: boolean
}) {
  const [profileState, profileAction] = useActionState<FormState, FormData>(updateAccountAction, {})
  const [pwState, pwAction] = useActionState<FormState, FormData>(changePasswordAction, {})

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <section className="panel p-5" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="microlabel">
          Account information
        </h2>
        <form action={profileAction} className="mt-4 space-y-3">
          {profileState.error && <Alert kind="error">{profileState.error}</Alert>}
          {profileState.success && <Alert kind="success">{profileState.success}</Alert>}
          <div>
            <label className="mb-1.5 block text-xs text-muted">Email</label>
            <input value={email} readOnly className="field opacity-60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-xs text-muted">
                First name
              </label>
              <input id="firstName" name="firstName" defaultValue={firstName} className="field" />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-xs text-muted">
                Last name
              </label>
              <input id="lastName" name="lastName" defaultValue={lastName} className="field" />
            </div>
          </div>
          <label className="flex items-center gap-2.5 pt-1 text-sm">
            <input
              type="checkbox"
              name="marketingOptOut"
              defaultChecked={marketingOptOut}
              className="h-4 w-4 accent-[#c9a961]"
            />
            Opt out of marketing &amp; cart-reminder emails
          </label>
          <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Saving…">
            Save Changes
          </SubmitButton>
        </form>
      </section>

      <section className="panel p-5" aria-labelledby="password-heading">
        <h2 id="password-heading" className="microlabel">
          Change password
        </h2>
        <form action={pwAction} className="mt-4 space-y-3">
          {pwState.error && <Alert kind="error">{pwState.error}</Alert>}
          {pwState.success && <Alert kind="success">{pwState.success}</Alert>}
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-xs text-muted">
              Current password
            </label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="field" />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-xs text-muted">
              New password
            </label>
            <input id="newPassword" name="password" type="password" autoComplete="new-password" required minLength={10} className="field" />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="mb-1.5 block text-xs text-muted">
              Confirm new password
            </label>
            <input id="confirmNewPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} className="field" />
          </div>
          <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Updating…">
            Update Password
          </SubmitButton>
        </form>
      </section>
    </div>
  )
}
