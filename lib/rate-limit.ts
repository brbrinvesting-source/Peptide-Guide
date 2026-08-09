import 'server-only'

// Simple in-memory sliding-window rate limiter. Adequate for a single-node
// deployment; swap for a Redis/Upstash-backed implementation when scaling
// horizontally (the call sites won't need to change).

const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const cutoff = now - windowMs
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  // opportunistic cleanup
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= cutoff)) buckets.delete(k)
    }
  }
  return true
}
