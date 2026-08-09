import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AuthShell } from '@/components/AuthShell'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to access the All-Access Peptides research catalog.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>
}) {
  const user = await getCurrentUser()
  if (user?.emailVerified) redirect('/catalog')
  const params = await searchParams

  return (
    <AuthShell
      title="Log in"
      subtitle={
        <>
          New here?{' '}
          <Link href="/register" className="text-gold hover:text-gold-bright">
            Create an account
          </Link>
        </>
      }
    >
      {params.reset === '1' && (
        <p role="status" className="mb-4 rounded-md border border-success/40 bg-success/10 px-3.5 py-2.5 text-sm text-success">
          Password updated. Log in with your new password.
        </p>
      )}
      <LoginForm next={params.next} />
      <p className="mt-5 text-center">
        <Link href="/forgot-password" className="text-xs tracking-wide text-muted hover:text-fg">
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  )
}
