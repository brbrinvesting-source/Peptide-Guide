'use client'

import { useState } from 'react'

export function RewardsCard({
  pointsBalance,
  pointsValueCents,
  referralUrl,
  referredCount,
  referralBonusPoints,
}: {
  pointsBalance: number
  pointsValueCents: number
  referralUrl: string
  referredCount: number
  referralBonusPoints: number
}) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the link is still selectable/visible.
    }
  }

  return (
    <div className="panel mt-8 grid gap-6 p-5 sm:grid-cols-2">
      <div>
        <p className="microlabel text-gold">Rewards points</p>
        <p className="mt-2 text-2xl font-bold">{pointsBalance.toLocaleString()}</p>
        <p className="mt-1 text-xs text-muted">
          ≈ ${(pointsValueCents / 100).toFixed(2)} in redeemable discount — apply at checkout
        </p>
      </div>
      <div>
        <p className="microlabel text-gold">Refer a friend</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Share your link. Your friend gets 2x points and 10% off their first order; you earn 2x
          points on that first order too, then normal points on everything they buy after that.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={referralUrl}
            onFocus={(e) => e.target.select()}
            className="field flex-1 font-mono text-xs"
            aria-label="Your referral link"
          />
          <button type="button" onClick={copyLink} className="btn btn-outline btn-sm shrink-0">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {referredCount > 0 && (
          <p className="mt-2 text-xs text-muted">
            {referredCount} friend{referredCount === 1 ? '' : 's'} referred ·{' '}
            {referralBonusPoints.toLocaleString()} bonus points earned
          </p>
        )}
      </div>
    </div>
  )
}
