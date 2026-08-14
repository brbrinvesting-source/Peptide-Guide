'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AAMark, Tagline } from './Logo'
import { SITE_GATE_COOKIE, SITE_GATE_STATEMENTS } from '@/lib/constants'

// Full-site entry gate. Purely a legal/UX checkpoint (not an access-control
// mechanism) — matches the checkbox-gate pattern common on research-chem
// storefronts. Persisted via a one-year cookie so returning visitors aren't
// re-prompted; local component state hides it immediately on accept without
// requiring a full page reload.

export function SiteGateModal() {
  const [dismissed, setDismissed] = useState(false)
  const [age, setAge] = useState(false)
  const [researchUse, setResearchUse] = useState(false)
  const [terms, setTerms] = useState(false)
  const allChecked = age && researchUse && terms

  useEffect(() => {
    document.body.style.overflow = dismissed ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [dismissed])

  if (dismissed) return null

  function handleEnter() {
    if (!allChecked) return
    document.cookie = `${SITE_GATE_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    setDismissed(true)
  }

  function handleExit() {
    window.location.href = 'https://www.google.com'
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-gate-heading"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/85 px-4 py-10 backdrop-blur-sm"
    >
      <div className="hex-texture panel w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex justify-center text-fg">
            <AAMark size={48} />
          </div>
          <Tagline className="mb-4" />
          <h1 id="site-gate-heading" className="text-2xl font-bold tracking-tight">
            Before You Continue
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            All-Access Peptides products are for laboratory research use only. Please confirm each
            statement below to enter.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <GateCheckbox checked={age} onChange={setAge} label={SITE_GATE_STATEMENTS.age} />
          <GateCheckbox
            checked={researchUse}
            onChange={setResearchUse}
            label={SITE_GATE_STATEMENTS.researchUse}
          />
          <GateCheckbox checked={terms} onChange={setTerms} label={null}>
            I agree to the site&rsquo;s{' '}
            <Link href="/legal/terms" target="_blank" rel="noreferrer" className="text-gold underline hover:text-gold-bright">
              Terms &amp; Conditions
            </Link>
            ,{' '}
            <Link href="/legal/privacy" target="_blank" rel="noreferrer" className="text-gold underline hover:text-gold-bright">
              Privacy Policy
            </Link>
            , and{' '}
            <Link
              href="/legal/research-disclaimer"
              target="_blank"
              rel="noreferrer"
              className="text-gold underline hover:text-gold-bright"
            >
              Research Use Disclaimer
            </Link>
            , and certify that I am qualified research personnel.
          </GateCheckbox>
        </div>

        <button
          type="button"
          onClick={handleEnter}
          disabled={!allChecked}
          className="btn btn-gold mt-6 w-full"
        >
          Enter Site
        </button>
        <button type="button" onClick={handleExit} className="btn btn-outline mt-3 w-full">
          No, Exit
        </button>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[0.65rem] text-muted">
          <FlaskIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
          Research use only — not for human or veterinary consumption.
        </p>
      </div>
    </div>
  )
}

function GateCheckbox({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string | null
  children?: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-panel-2 p-3.5 text-sm leading-relaxed transition-colors hover:border-line-strong">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#c9a961]"
      />
      <span>{label ?? children}</span>
    </label>
  )
}

function FlaskIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M9.5 2.5h5M10 3v6.2L4.8 18a1.6 1.6 0 001.4 2.5h11.6a1.6 1.6 0 001.4-2.5L14 9.2V3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.6 15h8.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
