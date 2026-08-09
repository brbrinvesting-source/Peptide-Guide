import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="hex-texture flex min-h-[60vh] items-center justify-center px-4 py-20">
      <div className="text-center">
        <p className="font-display text-6xl text-gold">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-gold">
            Home
          </Link>
          <Link href="/catalog" className="btn btn-outline">
            Catalog
          </Link>
        </div>
      </div>
    </div>
  )
}
