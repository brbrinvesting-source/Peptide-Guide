/* eslint-disable @next/next/no-img-element */

// Consistent product imagery. When the admin has uploaded a photo it is used;
// otherwise a brand-consistent vial rendering (clearly a placeholder, not a
// photograph) keeps the catalog uniform.

export function VialImage({
  name,
  vialSize,
  imageUrl,
  alt,
  className = '',
}: {
  name: string
  vialSize: string
  imageUrl?: string | null
  alt?: string | null
  className?: string
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt || `${name} — ${vialSize}`}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  const label = name.length > 22 ? `${name.slice(0, 21)}…` : name
  return (
    <div
      role="img"
      aria-label={`${name} — ${vialSize} vial illustration`}
      className={`hex-texture flex h-full w-full items-center justify-center bg-[#0d0e10] ${className}`}
    >
      <svg viewBox="0 0 120 160" className="h-[78%] w-auto" aria-hidden="true">
        {/* cap */}
        <rect x="42" y="10" width="36" height="16" rx="2" fill="#1c1d20" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <rect x="42" y="22" width="36" height="5" fill="#c9a961" opacity="0.9" />
        {/* neck */}
        <rect x="47" y="27" width="26" height="8" fill="#141518" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {/* body */}
        <rect x="34" y="35" width="52" height="112" rx="6" fill="#101114" stroke="rgba(255,255,255,0.4)" strokeWidth="1.25" />
        {/* label */}
        <rect x="38" y="52" width="44" height="76" rx="2" fill="#0d0e10" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
        {/* AA mark: two peak strokes + gold ascending data-line */}
        <path d="M46 66 L52.5 52 L59 66" stroke="#f5f5f4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M51 66 L57.5 52 L64 66" stroke="#f5f5f4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <polyline points="43,63 48,60 53,62 58,55 63,57 67,50" stroke="#c9a961" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="43" cy="63" r="1" fill="#c9a961" />
        <circle cx="53" cy="62" r="1" fill="#c9a961" />
        <circle cx="63" cy="57" r="1" fill="#c9a961" />
        <circle cx="67" cy="50" r="1" fill="#c9a961" />
        <text x="60" y="75" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="4.2" letterSpacing="0.6" fill="#f5f5f4">
          ALL-ACCESS
        </text>
        <text x="60" y="79.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="3.4" letterSpacing="1.1" fill="#c9a961">
          PEPTIDES
        </text>
        <rect x="41" y="84" width="38" height="7" fill="#f5f5f4" />
        <text x="60" y="89" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="4" letterSpacing="0.3" fill="#0a0a0a">
          {label.toUpperCase()}
        </text>
        <text x="60" y="99" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="4.6" fill="#f5f5f4">
          FOR RESEARCH USE ONLY
        </text>
        <line x1="45" y1="103" x2="75" y2="103" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
        <text x="60" y="112" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="6.2" fill="#f5f5f4">
          {vialSize}
        </text>
        <text x="60" y="121.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="3" fill="#9b9b96">
          NOT FOR HUMAN OR VETERINARY CONSUMPTION
        </text>
      </svg>
    </div>
  )
}
