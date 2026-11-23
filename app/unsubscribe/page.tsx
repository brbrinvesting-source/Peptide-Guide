import type { Metadata } from 'next'
import Link from 'next/link'
import { unsubscribeFromMarketing } from '@/app/actions/auth'
import { AuthShell } from '@/components/AuthShell'

export const metadata: Metadata = { title: 'Unsubscribe' }

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const ok = token ? await unsubscribeFromMarketing(token) : false

  return (
    <AuthShell title={ok ? "You're unsubscribed" : 'Link not valid'}>
      {ok ? (
        <div className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-muted">
            You won&apos;t receive marketing emails from All-Access Peptides going forward. Order
            confirmations and shipping updates for any order you place will still be sent, since
            those aren&apos;t marketing.
          </p>
          <Link href="/" className="btn btn-outline w-full">
            Back to the Site
          </Link>
        </div>
      ) : (
        <div className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-muted">
            This unsubscribe link is invalid or has already been used. If you&apos;re still
            receiving unwanted emails, you can also turn off marketing emails from your account
            settings while logged in.
          </p>
          <Link href="/account" className="btn btn-outline w-full">
            Account Settings
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
