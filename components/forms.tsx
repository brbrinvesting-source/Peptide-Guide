'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  className = 'btn btn-gold w-full',
  pendingLabel = 'Working…',
  disabled = false,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-3.5 py-2.5 text-sm ${
        kind === 'error'
          ? 'border-danger/40 bg-danger/10 text-danger'
          : 'border-success/40 bg-success/10 text-success'
      }`}
    >
      {children}
    </p>
  )
}

/** Generic form wrapper wiring a server action to error/success alerts. */
export function ActionForm({
  action,
  children,
  className = 'space-y-4',
  submitLabel,
  submitClassName,
  pendingLabel,
}: {
  action: (prev: { error?: string; success?: string }, formData: FormData) => Promise<{ error?: string; success?: string }>
  children: React.ReactNode
  className?: string
  submitLabel: string
  submitClassName?: string
  pendingLabel?: string
}) {
  const [state, formAction] = useActionState(action, {})
  return (
    <form action={formAction} className={className}>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      {children}
      <SubmitButton className={submitClassName} pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
