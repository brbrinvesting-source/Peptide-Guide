import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyEmailToken } from '@/app/actions/auth'
import { AuthShell } from '@/components/AuthShell'

export const metadata: Metadata = { title: 'Verify Email' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const ok = token ? await verifyEmailToken(token) : false

  return (
    <AuthShell title={ok ? 'Email verified' : 'Verification failed'}>
      {ok ? (
        <div className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-muted">
            Your account is active. A welcome email with your one-time first-order discount code is
            on its way to your inbox.
          </p>
          <Link href="/login" className="btn btn-gold w-full">
            Log In &amp; Enter the Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-muted">
            This verification link is invalid or has expired. Log in to request a new verification
            email.
          </p>
          <Link href="/login" className="btn btn-outline w-full">
            Back to Log In
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
