import Image from 'next/image'
import Link from 'next/link'

// The official All-Access Peptides logo (provided asset, used verbatim —
// not redrawn). Single source of truth: public/brand/aa-logo.png.
// Intrinsic size 1536x1024; keep that aspect ratio wherever it's placed.
const LOGO_SRC = '/brand/aa-logo.png'
const LOGO_ASPECT = 1536 / 1024

export function LogoImage({
  height = 40,
  className = '',
  priority = false,
}: {
  height?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="All-Access Peptides"
      width={Math.round(height * LOGO_ASPECT)}
      height={height}
      priority={priority}
      className={`h-auto w-auto ${className}`}
    />
  )
}

export function Logo({ height = 44 }: { height?: number }) {
  return (
    <Link href="/" className="flex items-center" aria-label="All-Access Peptides home">
      <LogoImage height={height} priority />
    </Link>
  )
}

export function Tagline({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[0.65rem] font-medium tracking-[0.28em] text-muted uppercase ${className}`}>
      Pure Science. Proven Results.
    </p>
  )
}
