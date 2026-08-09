import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { ResetForm } from './ResetForm'

export const metadata: Metadata = { title: 'Reset Password' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) {
    return (
      <AuthShell title="Invalid link">
        <p className="text-center text-sm text-muted">
          This password reset link is incomplete.{' '}
          <Link href="/forgot-password" className="text-gold">
            Request a new one.
          </Link>
        </p>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Choose a new password">
      <ResetForm token={token} />
    </AuthShell>
  )
}
