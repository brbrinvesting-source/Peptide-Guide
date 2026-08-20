import type { Config } from '@netlify/functions'
import { absoluteUrl } from '../../lib/site'

// Scheduled trigger for the abandoned-cart email job. Keeps all the actual
// logic in one place (lib/abandoned-carts.ts, invoked via the cron-secret-
// protected /api/cron/abandoned-carts route) instead of duplicating it here
// — this function's only job is to call that route on a schedule.
export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('abandoned-carts-cron: CRON_SECRET is not set — skipping run.')
    return
  }
  const res = await fetch(absoluteUrl('/api/cron/abandoned-carts'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.text().catch(() => '')
  console.log(`abandoned-carts-cron: ${res.status} ${body.slice(0, 500)}`)
}

export const config: Config = {
  schedule: '*/15 * * * *',
}
