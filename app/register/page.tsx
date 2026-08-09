import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AuthShell } from '@/components/AuthShell'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create an account to access the All-Access Peptides research catalog.',
}

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user?.emailVerified) redirect('/catalog')

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already registered?{' '}
          <Link href="/login" className="text-gold hover:text-gold-bright">
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm />
      <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-muted">
        By creating an account you agree to our{' '}
        <Link href="/legal/terms" className="underline hover:text-fg">
          Terms
        </Link>{' '}
        and acknowledge that all products are for research use only — not for human or veterinary
        consumption.
      </p>
    </AuthShell>
  )
}
