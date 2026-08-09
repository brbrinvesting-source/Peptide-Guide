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
        <rect x="38" y="52" width="44" height="76" rx="2" fill="#f5f5f4" />
        <path d="M60 58 L66 61.5 V68.5 L60 72 L54 68.5 V61.5 Z" fill="none" stroke="#0a0a0a" strokeWidth="1.2" />
        <text x="60" y="67.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="6" fill="#0a0a0a">
          AA
        </text>
        <text x="60" y="86" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="6.4" letterSpacing="0.4" fill="#0a0a0a">
          {label.toUpperCase()}
        </text>
        <line x1="44" y1="93" x2="76" y2="93" stroke="#c9a961" strokeWidth="1" />
        <text x="60" y="103" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="7.2" fill="#0a0a0a">
          {vialSize}
        </text>
        <text x="60" y="116" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="3.6" fill="#5a5a5a">
          FOR RESEARCH USE ONLY
        </text>
        <text x="60" y="121.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="3.2" fill="#8a8a8a">
          NOT FOR HUMAN CONSUMPTION
        </text>
      </svg>
    </div>
  )
}
