import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { ForgotForm } from './ForgotForm'

export const metadata: Metadata = { title: 'Forgot Password' }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send a reset link."
    >
      <ForgotForm />
      <p className="mt-5 text-center">
        <Link href="/login" className="text-xs tracking-wide text-muted hover:text-fg">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  )
}
