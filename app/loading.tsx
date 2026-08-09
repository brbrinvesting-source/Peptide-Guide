export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <svg width="40" height="44" viewBox="0 0 48 48" className="animate-pulse text-gold" aria-hidden="true">
        <path d="M24 2 L43 13 V35 L24 46 L5 35 V13 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  )
}
