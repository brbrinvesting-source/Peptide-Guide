import Link from 'next/link'

export function AAMark({ size = 36 }: { size?: number }) {
  // Minimal "AA" monogram inside a thin hexagonal frame — echoes the vial mark.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M24 2 L43 13 V35 L24 46 L5 35 V13 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="700"
        fontSize="17"
        letterSpacing="0.5"
        fill="currentColor"
      >
        AA
      </text>
      <path d="M15 36.5 H33" stroke="#c9a961" strokeWidth="1.25" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 text-fg" aria-label="All-Access Peptides home">
      <AAMark size={compact ? 30 : 36} />
      {!compact && (
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-bold tracking-[0.22em]">ALL-ACCESS</span>
          <span className="text-[0.65rem] tracking-[0.42em] text-gold">PEPTIDES</span>
        </span>
      )}
    </Link>
  )
}
