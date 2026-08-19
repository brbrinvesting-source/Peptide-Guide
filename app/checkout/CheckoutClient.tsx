'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { US_STATES, formatCents } from '@/lib/constants'

interface AddressValue {
  name: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  phone: string
}

const emptyAddress: AddressValue = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
}

interface Totals {
  subtotalCents: number
  bulkDiscountCents: number
  promoDiscountCents: number
  merchandiseTotalCents: number
  freeShippingQualified: boolean
}

interface FinalTotals {
  subtotalCents: number
  bulkDiscountCents: number
  promoDiscountCents: number
  referralDiscountCents: number
  pointsRedeemed: number
  pointsDiscountCents: number
  pointsEarned: number
  shippingCents: number
  insuranceCents: number
  taxCents: number
  totalCents: number
}

export function CheckoutClient(props: {
  customer: { email: string }
  lines: { name: string; vialSize: string; quantity: number; lineTotalCents: number }[]
  totals: Totals
  promoCode: string | null
  insuranceCents: number | null
  referralDiscountCents: number
  referralFirstOrderEligible: boolean
  pointsBalance: number
  pointsRedemptionPerDollar: number
  pointsEnabled: boolean
  savedShipping: AddressValue | null
  savedBilling: AddressValue | null
  shippingMethods: {
    id: string
    name: string
    priceCents: number
    deliveryEstimate: string | null
    freeShippingEligible: boolean
    isLive: boolean
  }[]
  acknowledgementText: string
  stripePublishableKey: string
}) {
  const [shipping, setShippingRaw] = useState<AddressValue>(props.savedShipping ?? emptyAddress)
  const [billingSame, setBillingSame] = useState(!props.savedBilling)
  const [billing, setBilling] = useState<AddressValue>(props.savedBilling ?? emptyAddress)
  const [shippingMethodId, setShippingMethodId] = useState(props.shippingMethods[0].id)
  const [insuranceElected, setInsuranceElected] = useState(false)
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hasLiveMethods = props.shippingMethods.some((m) => m.isLive)
  const [liveRates, setLiveRates] = useState<Record<string, number>>({})
  const [liveRateErrors, setLiveRateErrors] = useState<Record<string, string>>({})
  const [fetchingRates, setFetchingRates] = useState(false)

  // Any address edit invalidates previously-fetched live rates.
  function setShipping(v: AddressValue) {
    setShippingRaw(v)
    if (hasLiveMethods) {
      setLiveRates({})
      setLiveRateErrors({})
    }
  }

  const addressComplete =
    shipping.name.trim().length > 1 &&
    shipping.line1.trim().length > 2 &&
    shipping.city.trim().length > 1 &&
    shipping.state !== '' &&
    /^\d{5}(-\d{4})?$/.test(shipping.postalCode.trim())

  async function fetchLiveRates() {
    setFetchingRates(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping: { ...shipping, line2: shipping.line2 || '', phone: shipping.phone || '' },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not calculate live shipping rates.')
        return
      }
      const rates: Record<string, number> = {}
      const errors: Record<string, string> = {}
      for (const [methodId, result] of Object.entries(
        data.rates as Record<string, { cents: number } | { error: string }>
      )) {
        if ('cents' in result) rates[methodId] = result.cents
        else errors[methodId] = result.error
      }
      setLiveRates(rates)
      setLiveRateErrors(errors)
    } catch {
      setError('Network error while calculating shipping rates. Please try again.')
    } finally {
      setFetchingRates(false)
    }
  }
  const [payment, setPayment] = useState<{
    clientSecret: string
    orderNumber: string
    totals: FinalTotals
  } | null>(null)

  const stripePromise = useMemo(
    () => (props.stripePublishableKey ? loadStripe(props.stripePublishableKey) : null),
    [props.stripePublishableKey]
  )

  const selectedMethod = props.shippingMethods.find((m) => m.id === shippingMethodId)!
  const isFreeSelected = props.totals.freeShippingQualified && selectedMethod.freeShippingEligible
  const shippingPreviewCents = isFreeSelected
    ? 0
    : selectedMethod.isLive
      ? (liveRates[selectedMethod.id] ?? null)
      : selectedMethod.priceCents
  const insurancePreviewCents = insuranceElected ? (props.insuranceCents ?? 0) : 0

  const pointsRequested = Math.max(0, parseInt(pointsToRedeemInput, 10) || 0)
  const maxPointsBySpend = Math.floor(
    (props.totals.merchandiseTotalCents * props.pointsRedemptionPerDollar) / 100
  )
  const pointsRedeemedPreview = Math.min(pointsRequested, props.pointsBalance, maxPointsBySpend)
  const pointsDiscountPreviewCents = Math.floor((pointsRedeemedPreview * 100) / props.pointsRedemptionPerDollar)

  async function continueToPayment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (selectedMethod.isLive && !isFreeSelected && liveRates[selectedMethod.id] === undefined) {
      setError('Please calculate live shipping rates for your address before continuing.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: shipping.name,
          shipping: { ...shipping, line2: shipping.line2 || '', phone: shipping.phone || '' },
          billingSameAsShipping: billingSame,
          billing: billingSame ? null : billing,
          shippingMethodId,
          insuranceElected,
          pointsToRedeem: pointsRedeemedPreview,
          acceptedDisclaimer: accepted,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setPayment({ clientSecret: data.clientSecret, orderNumber: data.orderNumber, totals: data.totals })
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="gold-keyline text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {!payment ? (
            <form onSubmit={continueToPayment} className="space-y-8">
              {error && (
                <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}

              {/* Customer */}
              <section aria-labelledby="customer-heading">
                <h2 id="customer-heading" className="microlabel">
                  1 · Customer
                </h2>
                <div className="mt-3">
                  <label htmlFor="email" className="mb-1.5 block text-xs text-muted">
                    Email
                  </label>
                  <input id="email" value={props.customer.email} readOnly className="field opacity-60 sm:max-w-xs" />
                </div>
              </section>

              {/* Shipping */}
              <section aria-labelledby="shipping-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="shipping-heading" className="microlabel">
                    2 · Shipping address (U.S. only)
                  </h2>
                  {props.savedShipping && (
                    <button
                      type="button"
                      onClick={() => setShipping(emptyAddress)}
                      className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
                    >
                      Filled from your last order — clear
                    </button>
                  )}
                </div>
                <AddressFields value={shipping} onChange={setShipping} idPrefix="ship" />
              </section>

              {/* Billing */}
              <section aria-labelledby="billing-heading">
                <h2 id="billing-heading" className="microlabel">
                  3 · Billing address
                </h2>
                <label className="mt-3 flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={billingSame}
                    onChange={(e) => setBillingSame(e.target.checked)}
                    className="h-4 w-4 accent-[#c9a961]"
                  />
                  Same as shipping address
                </label>
                {!billingSame && <AddressFields value={billing} onChange={setBilling} idPrefix="bill" />}
              </section>

              {/* Shipping method */}
              <section aria-labelledby="method-heading">
                <h2 id="method-heading" className="microlabel">
                  4 · Shipping method
                </h2>
                {hasLiveMethods && (
                  <div className="mt-3 flex items-center gap-3 rounded-md border border-line/60 bg-ink/40 px-4 py-3">
                    <button
                      type="button"
                      onClick={fetchLiveRates}
                      disabled={!addressComplete || fetchingRates}
                      className="btn btn-outline btn-sm shrink-0"
                    >
                      {fetchingRates ? 'Calculating…' : 'Calculate expedited shipping rates'}
                    </button>
                    <p className="text-xs text-muted">
                      {addressComplete
                        ? 'Get live 2-Day / Next Day pricing for your address.'
                        : 'Complete your shipping address above first.'}
                    </p>
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  {props.shippingMethods.map((m) => {
                    const free = props.totals.freeShippingQualified && m.freeShippingEligible
                    const liveCents = liveRates[m.id]
                    const liveError = liveRateErrors[m.id]
                    const liveUnresolved = m.isLive && !free && liveCents === undefined
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between gap-4 rounded-md border px-4 py-3.5 text-sm transition-colors ${
                          liveUnresolved ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        } ${
                          shippingMethodId === m.id ? 'border-gold bg-gold/5' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingMethod"
                            checked={shippingMethodId === m.id}
                            disabled={liveUnresolved}
                            onChange={() => setShippingMethodId(m.id)}
                            className="h-4 w-4 accent-[#c9a961]"
                          />
                          <span>
                            <span className="font-semibold">{m.name}</span>
                            {m.deliveryEstimate && (
                              <span className="block text-xs text-muted">{m.deliveryEstimate}</span>
                            )}
                          </span>
                        </span>
                        <span className={free ? 'font-bold text-gold' : 'font-semibold'}>
                          {free
                            ? 'FREE'
                            : m.isLive
                              ? liveError
                                ? <span className="text-xs font-normal text-danger">{liveError}</span>
                                : liveCents !== undefined
                                  ? formatCents(liveCents)
                                  : <span className="text-xs font-normal text-muted">Calculate above</span>
                              : formatCents(m.priceCents)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>

              {/* Shipping insurance */}
              {props.insuranceCents !== null && (
                <section aria-labelledby="insurance-heading">
                  <h2 id="insurance-heading" className="microlabel">
                    5 · Shipping insurance (optional)
                  </h2>
                  <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-md border border-line px-4 py-3.5 text-sm transition-colors hover:border-line-strong">
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={insuranceElected}
                        onChange={(e) => setInsuranceElected(e.target.checked)}
                        className="h-4 w-4 accent-[#c9a961]"
                      />
                      <span>
                        <span className="font-semibold">Add shipping insurance</span>
                        <span className="block text-xs text-muted">Covers loss or damage in transit</span>
                      </span>
                    </span>
                    <span className="font-semibold">{formatCents(props.insuranceCents)}</span>
                  </label>
                </section>
              )}

              {/* Referral discount — automatic, no code to enter */}
              {props.referralFirstOrderEligible && props.referralDiscountCents > 0 && (
                <div className="flex items-center justify-between gap-4 rounded-md border border-gold/40 bg-gold/5 px-4 py-3 text-sm">
                  <span className="font-semibold text-gold">Referral welcome discount applied</span>
                  <span className="font-semibold text-gold">−{formatCents(props.referralDiscountCents)}</span>
                </div>
              )}

              {/* Rewards points */}
              {props.pointsEnabled && props.pointsBalance > 0 && (
                <section aria-labelledby="points-heading">
                  <h2 id="points-heading" className="microlabel">
                    6 · Rewards points (optional)
                  </h2>
                  <div className="mt-3 rounded-md border border-line px-4 py-3.5 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted">
                        You have <span className="font-semibold text-fg">{props.pointsBalance.toLocaleString()}</span>{' '}
                        points ({formatCents(Math.floor((props.pointsBalance * 100) / props.pointsRedemptionPerDollar))}{' '}
                        value)
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={props.pointsBalance}
                        placeholder="0"
                        value={pointsToRedeemInput}
                        onChange={(e) => setPointsToRedeemInput(e.target.value)}
                        className="field w-32"
                        aria-label="Points to redeem"
                      />
                      <button
                        type="button"
                        onClick={() => setPointsToRedeemInput(String(props.pointsBalance))}
                        className="text-xs text-gold underline-offset-2 hover:text-gold-bright hover:underline"
                      >
                        Use max
                      </button>
                      {pointsRedeemedPreview > 0 && (
                        <span className="ml-auto font-semibold text-gold">
                          −{formatCents(pointsDiscountPreviewCents)}
                        </span>
                      )}
                    </div>
                    {pointsRequested > pointsRedeemedPreview && (
                      <p className="mt-2 text-xs text-muted">
                        Capped at {pointsRedeemedPreview.toLocaleString()} points — the most this order can use.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Research acknowledgement */}
              <section aria-labelledby="ack-heading" className="panel border-gold/40 p-4">
                <h2 id="ack-heading" className="sr-only">
                  Research use acknowledgement
                </h2>
                <label className="flex items-start gap-3 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                    className="mt-1 h-4 w-4 shrink-0 accent-[#c9a961]"
                  />
                  <span>{props.acknowledgementText}</span>
                </label>
              </section>

              <button
                type="submit"
                className="btn btn-gold w-full"
                disabled={!accepted || submitting || shippingPreviewCents === null}
                aria-busy={submitting}
              >
                {submitting ? 'Calculating shipping & tax…' : 'Continue to Payment'}
              </button>
            </form>
          ) : (
            <section aria-labelledby="pay-heading">
              <div className="mb-5 flex items-center justify-between">
                <h2 id="pay-heading" className="microlabel">
                  5 · Payment — order {payment.orderNumber}
                </h2>
                <button
                  type="button"
                  onClick={() => setPayment(null)}
                  className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
                >
                  ← Edit details
                </button>
              </div>
              {stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: payment.clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#c9a961',
                        colorBackground: '#111214',
                        colorText: '#f5f5f4',
                        borderRadius: '6px',
                      },
                    },
                  }}
                >
                  <PaymentForm totalCents={payment.totals.totalCents} />
                </Elements>
              ) : (
                <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                  Payment is not configured (missing publishable key). Please contact support.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Order review */}
        <aside aria-label="Order review">
          <div className="panel sticky top-20 p-5">
            <h2 className="microlabel">Order review</h2>
            <ul className="mt-4 space-y-2.5 border-b border-line pb-4 text-sm">
              {props.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-muted">
                    {l.name} <span className="text-xs">— {l.vialSize}</span> ×{l.quantity}
                  </span>
                  <span>{formatCents(l.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCents((payment?.totals ?? props.totals).subtotalCents)} />
              {(payment?.totals ?? props.totals).bulkDiscountCents > 0 && (
                <Row gold label="Bulk discount" value={`−${formatCents((payment?.totals ?? props.totals).bulkDiscountCents)}`} />
              )}
              {(payment?.totals ?? props.totals).promoDiscountCents > 0 && (
                <Row
                  gold
                  label={`Promo${props.promoCode ? ` (${props.promoCode})` : ''}`}
                  value={`−${formatCents((payment?.totals ?? props.totals).promoDiscountCents)}`}
                />
              )}
              {((payment ? payment.totals.referralDiscountCents : props.referralDiscountCents) > 0) && (
                <Row
                  gold
                  label="Referral welcome discount"
                  value={`−${formatCents(payment ? payment.totals.referralDiscountCents : props.referralDiscountCents)}`}
                />
              )}
              {((payment ? payment.totals.pointsDiscountCents : pointsDiscountPreviewCents) > 0) && (
                <Row
                  gold
                  label={`Points redeemed (${(payment ? payment.totals.pointsRedeemed : pointsRedeemedPreview).toLocaleString()})`}
                  value={`−${formatCents(payment ? payment.totals.pointsDiscountCents : pointsDiscountPreviewCents)}`}
                />
              )}
              <Row
                label="Shipping"
                value={
                  payment
                    ? payment.totals.shippingCents === 0
                      ? 'FREE'
                      : formatCents(payment.totals.shippingCents)
                    : shippingPreviewCents === null
                      ? 'Calculate above'
                      : shippingPreviewCents === 0
                        ? 'FREE'
                        : formatCents(shippingPreviewCents)
                }
              />
              {((payment?.totals.insuranceCents ?? insurancePreviewCents) > 0) && (
                <Row
                  label="Shipping insurance"
                  value={formatCents(payment ? payment.totals.insuranceCents : insurancePreviewCents)}
                />
              )}
              <Row label="Tax" value={payment ? formatCents(payment.totals.taxCents) : 'Calculated next step'} />
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>
                  {payment
                    ? formatCents(payment.totals.totalCents)
                    : shippingPreviewCents === null
                      ? `${formatCents(props.totals.merchandiseTotalCents - pointsDiscountPreviewCents + insurancePreviewCents)} + shipping + tax`
                      : `${formatCents(props.totals.merchandiseTotalCents - pointsDiscountPreviewCents + shippingPreviewCents + insurancePreviewCents)} + tax`}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[0.65rem] leading-relaxed text-muted">
              For research use only — not for human or veterinary consumption.{' '}
              <Link href="/cart" className="underline hover:text-fg">
                Back to cart
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={gold ? 'text-gold' : ''}>{value}</dd>
    </div>
  )
}

function AddressFields({
  value,
  onChange,
  idPrefix,
}: {
  value: AddressValue
  onChange: (v: AddressValue) => void
  idPrefix: string
}) {
  const set = (k: keyof AddressValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value })
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="mb-1.5 block text-xs text-muted">
          Recipient name
        </label>
        <input id={`${idPrefix}-name`} required value={value.name} onChange={set('name')} autoComplete="name" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-line1`} className="mb-1.5 block text-xs text-muted">
          Street address
        </label>
        <input id={`${idPrefix}-line1`} required value={value.line1} onChange={set('line1')} autoComplete="address-line1" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-line2`} className="mb-1.5 block text-xs text-muted">
          Apt / suite (optional)
        </label>
        <input id={`${idPrefix}-line2`} value={value.line2} onChange={set('line2')} autoComplete="address-line2" className="field" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-city`} className="mb-1.5 block text-xs text-muted">
          City
        </label>
        <input id={`${idPrefix}-city`} required value={value.city} onChange={set('city')} autoComplete="address-level2" className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-state`} className="mb-1.5 block text-xs text-muted">
            State
          </label>
          <select id={`${idPrefix}-state`} required value={value.state} onChange={set('state')} autoComplete="address-level1" className="field">
            <option value="">State</option>
            {Object.entries(US_STATES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-zip`} className="mb-1.5 block text-xs text-muted">
            ZIP
          </label>
          <input
            id={`${idPrefix}-zip`}
            required
            value={value.postalCode}
            onChange={set('postalCode')}
            autoComplete="postal-code"
            inputMode="numeric"
            pattern="\d{5}(-\d{4})?"
            className="field"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className="mb-1.5 block text-xs text-muted">
          Phone (optional)
        </label>
        <input id={`${idPrefix}-phone`} value={value.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" className="field" />
      </div>
      <div className="self-end">
        <label htmlFor={`${idPrefix}-country`} className="mb-1.5 block text-xs text-muted">
          Country
        </label>
        <input id={`${idPrefix}-country`} value="United States" readOnly className="field opacity-60" />
      </div>
    </div>
  )
}

function PaymentForm({ totalCents }: { totalCents: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    })
    // Only reached on immediate failure — success redirects to return_url.
    if (submitError) {
      setError(submitError.message ?? 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-gold w-full" disabled={!stripe || processing} aria-busy={processing}>
        {processing ? 'Processing…' : `Pay ${formatCents(totalCents)}`}
      </button>
      <p className="text-center text-[0.65rem] text-muted">
        Payments are processed securely by Stripe. Card details never touch our servers.
      </p>
    </form>
  )
}
