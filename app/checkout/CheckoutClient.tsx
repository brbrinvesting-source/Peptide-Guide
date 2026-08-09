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
  shippingCents: number
  taxCents: number
  totalCents: number
}

export function CheckoutClient(props: {
  customer: { email: string; name: string }
  lines: { name: string; vialSize: string; quantity: number; lineTotalCents: number }[]
  totals: Totals
  promoCode: string | null
  shippingMethods: {
    id: string
    name: string
    priceCents: number
    deliveryEstimate: string | null
    freeShippingEligible: boolean
  }[]
  acknowledgementText: string
  stripePublishableKey: string
}) {
  const [customerName, setCustomerName] = useState(props.customer.name)
  const [shipping, setShipping] = useState<AddressValue>(emptyAddress)
  const [billingSame, setBillingSame] = useState(true)
  const [billing, setBilling] = useState<AddressValue>(emptyAddress)
  const [shippingMethodId, setShippingMethodId] = useState(props.shippingMethods[0].id)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
  const shippingPreviewCents =
    props.totals.freeShippingQualified && selectedMethod.freeShippingEligible
      ? 0
      : selectedMethod.priceCents

  async function continueToPayment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          shipping: { ...shipping, line2: shipping.line2 || '', phone: shipping.phone || '' },
          billingSameAsShipping: billingSame,
          billing: billingSame ? null : billing,
          shippingMethodId,
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="customerName" className="mb-1.5 block text-xs text-muted">
                      Full name
                    </label>
                    <input
                      id="customerName"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      autoComplete="name"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-xs text-muted">
                      Email
                    </label>
                    <input id="email" value={props.customer.email} readOnly className="field opacity-60" />
                  </div>
                </div>
              </section>

              {/* Shipping */}
              <section aria-labelledby="shipping-heading">
                <h2 id="shipping-heading" className="microlabel">
                  2 · Shipping address (U.S. only)
                </h2>
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
                <div className="mt-3 space-y-2">
                  {props.shippingMethods.map((m) => {
                    const free = props.totals.freeShippingQualified && m.freeShippingEligible
                    return (
                      <label
                        key={m.id}
                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-md border px-4 py-3.5 text-sm transition-colors ${
                          shippingMethodId === m.id ? 'border-gold bg-gold/5' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingMethod"
                            checked={shippingMethodId === m.id}
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
                          {free ? 'FREE' : formatCents(m.priceCents)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>

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

              <button type="submit" className="btn btn-gold w-full" disabled={!accepted || submitting} aria-busy={submitting}>
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
              <Row
                label="Shipping"
                value={
                  payment
                    ? payment.totals.shippingCents === 0
                      ? 'FREE'
                      : formatCents(payment.totals.shippingCents)
                    : shippingPreviewCents === 0
                      ? 'FREE'
                      : formatCents(shippingPreviewCents)
                }
              />
              <Row label="Tax" value={payment ? formatCents(payment.totals.taxCents) : 'Calculated next step'} />
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>
                  {payment
                    ? formatCents(payment.totals.totalCents)
                    : `${formatCents(props.totals.merchandiseTotalCents + shippingPreviewCents)} + tax`}
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
