import { NextRequest, NextResponse } from 'next/server'
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE_SECONDS } from '@/lib/referrals'

// Shareable referral link: /r/CODE -> sets an attribution cookie, then sends
// the visitor to registration. The code itself isn't validated here (an
// invalid one just results in no attribution) — validation happens once,
// server-side, at actual registration.

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const res = NextResponse.redirect(new URL('/register', req.url))
  res.cookies.set(REFERRAL_COOKIE, code.trim().toUpperCase(), {
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  return res
}
