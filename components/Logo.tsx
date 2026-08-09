import Link from 'next/link'

/**
 * The All-Access Peptides mark: two mountain-peak strokes forming "AA"
 * (no crossbars — open chevrons, as on the vial label) with a gold dotted
 * line-graph ascending across them left to right.
 */
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
      {/* Left peak */}
      <path
        d="M28 80 L52 12 L76 80"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right peak (overlapping, forms the second "A") */}
      <path
        d="M44 80 L68 12 L92 80"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Gold ascending data-line across the peaks */}
      <polyline
        points="14,68 34,58 50,64 66,38 82,44 106,20"
        stroke="#c9a961"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="14" cy="68" r="3.5" fill="#c9a961" />
      <circle cx="34" cy="58" r="3.5" fill="#c9a961" />
      <circle cx="50" cy="64" r="3.5" fill="#c9a961" />
      <circle cx="66" cy="38" r="3.5" fill="#c9a961" />
      <circle cx="82" cy="44" r="3.5" fill="#c9a961" />
      <circle cx="106" cy="20" r="3.5" fill="#c9a961" />
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
