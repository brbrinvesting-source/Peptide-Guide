import { NextRequest, NextResponse } from 'next/server'
import { processAbandonedCarts } from '@/lib/abandoned-carts'

// Scheduled job endpoint — invoke every ~15 minutes from your scheduler
// (Netlify Scheduled Functions, cron + curl, GitHub Actions, etc.):
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/abandoned-carts

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await processAbandonedCarts()
  return NextResponse.json(result)
}
