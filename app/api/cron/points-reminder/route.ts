import { NextRequest, NextResponse } from 'next/server'
import { processPointsReminders } from '@/lib/points-reminders'

// Scheduled job endpoint — invoke daily from your scheduler (Netlify
// Scheduled Functions, cron + curl, GitHub Actions, etc.). Each customer is
// only actually emailed once per the configured interval (Admin -> Settings
// -> Rewards reminder email), so running this more often than that is safe:
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/points-reminder

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await processPointsReminders()
  return NextResponse.json(result)
}
