import type { Config } from '@netlify/functions'
import { absoluteUrl } from '../../lib/site'

// Scheduled trigger for the points-reminder email job. Keeps all the actual
// logic in one place (lib/points-reminders.ts, invoked via the cron-secret-
// protected /api/cron/points-reminder route) instead of duplicating it here
// — this function's only job is to call that route on a schedule. Runs
// daily; the route itself only actually emails a given customer once per
// the configured interval (Admin -> Settings -> Rewards reminder email), so
// a daily check is safe and just means no one waits longer than a day past
// their due date.
export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('points-reminder-cron: CRON_SECRET is not set — skipping run.')
    return
  }
  const res = await fetch(absoluteUrl('/api/cron/points-reminder'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.text().catch(() => '')
  console.log(`points-reminder-cron: ${res.status} ${body.slice(0, 500)}`)
}

export const config: Config = {
  schedule: '0 16 * * *',
}
