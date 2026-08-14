import Link from 'next/link'

/**
 * The All-Access Peptides mark: two solid mountain peaks forming "AA" with
 * a gold molecular/data-line draped across them, trailing off past the
 * right peak. This is the single source of truth for the mark's geometry —
 * every other usage (vial placeholder art, favicon) embeds this same path
 * data rather than hand-drawing its own copy, so the mark never drifts.
 *
 * Canonical coordinate space: viewBox "0 0 120 94".
 */
export function AAMarkGraphic({ fill = 'currentColor' }: { fill?: string }) {
  return (
    <>
      {/* Left peak */}
      <path d="M30 82 L54 14 L78 82 Z" fill={fill} />
      {/* Right peak (overlapping, forms the second "A") */}
      <path d="M46 82 L70 14 L94 82 Z" fill={fill} />
      {/* Gold molecular data-line draped across the peaks, trailing past the right edge */}
      <polyline
        points="14,68 34,58 50,64 66,38 82,44 106,20"
        stroke="#c9a961"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="14" cy="68" r="4.2" fill="#c9a961" />
      <circle cx="34" cy="58" r="4.2" fill="#c9a961" />
      <circle cx="50" cy="64" r="4.2" fill="#c9a961" />
      <circle cx="66" cy="38" r="4.2" fill="#c9a961" />
      <circle cx="82" cy="44" r="4.2" fill="#c9a961" />
      <circle cx="106" cy="20" r="4.2" fill="#c9a961" />
    </>
  )
}

export function AAMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 120 94"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <AAMarkGraphic />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 text-fg" aria-label="All-Access Peptides home">
      <AAMark size={compact ? 34 : 42} />
      {!compact && (
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-bold tracking-[0.22em]">ALL-ACCESS</span>
          <span className="text-[0.65rem] tracking-[0.42em] text-gold">PEPTIDES</span>
        </span>
      )}
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
