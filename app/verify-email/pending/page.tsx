import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AuthShell } from '@/components/AuthShell'
import { ResendForm } from './ResendForm'

export const metadata: Metadata = { title: 'Verify Your Email' }

export default async function VerifyPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const user = await getCurrentUser()
  if (user?.emailVerified) redirect('/catalog')
  const { registered } = await searchParams

  return (
    <AuthShell title="Check your inbox">
      <div className="space-y-5 text-center">
        <p className="text-sm leading-relaxed text-muted">
          {registered
            ? 'Your account was created. We sent a verification link to your email — click it to activate your account and access the catalog.'
            : 'Your email address is not verified yet. Click the link in the verification email to access the catalog.'}
        </p>
        {user ? (
          <ResendForm />
        ) : (
          <p className="text-xs text-muted">
            Didn&apos;t get it? Log in to resend the verification email.
          </p>
        )}
      </div>
    </AuthShell>
  )
}
