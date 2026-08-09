'use client'

import Link from 'next/link'
import { useEffect } from 'react'

// Friendly error boundary — no stack traces or internals are ever shown.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted">
          An unexpected error occurred. Your cart and account are safe.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={reset} className="btn btn-gold">
            Try Again
          </button>
          <Link href="/" className="btn btn-outline">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
