'use client'

import { useActionState } from 'react'
import { buyShippingLabelAction, refundOrderAction, updateOrderAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ['CANCELLED'],
  PAYMENT_PROCESSING: [],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['FULFILLED'],
  FULFILLED: [],
  CANCELLED: [],
  REFUNDED: [],
}

export function OrderAdminForms(props: {
  orderId: string
  status: string
  paymentStatus: string
  trackingNumber: string
  trackingCarrier: string
  trackingUrlProvider: string | null
  labelUrl: string | null
  shippoTransactionId: string | null
  canBuyLabel: boolean
  adminNotes: string
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(updateOrderAction, {})
  const [refundState, refundAction] = useActionState<AdminActionState, FormData>(refundOrderAction, {})
  const [labelState, labelAction] = useActionState<AdminActionState, FormData>(buyShippingLabelAction, {})
  const nextStatuses = NEXT_STATUS[props.status] ?? []
  const canPurchase =
    props.canBuyLabel &&
    !props.shippoTransactionId &&
    props.paymentStatus === 'PAID' &&
    ['PAID', 'PROCESSING'].includes(props.status)

  return (
    <>
      {props.canBuyLabel && (
        <section className="panel p-4">
          <p className="microlabel text-gold">Shippo label</p>
          {props.shippoTransactionId ? (
            <div className="mt-3 space-y-1.5 text-sm">
              <p>
                Tracking: <span className="font-mono">{props.trackingNumber}</span>
                {props.trackingCarrier && <span className="text-muted"> ({props.trackingCarrier})</span>}
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                {props.labelUrl && (
                  <a href={props.labelUrl} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
                    Print label (PDF)
                  </a>
                )}
                {props.trackingUrlProvider && (
                  <a href={props.trackingUrlProvider} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
                    Track package
                  </a>
                )}
              </div>
            </div>
          ) : (
            <form action={labelAction} className="mt-3 space-y-3">
              {labelState.error && <Alert kind="error">{labelState.error}</Alert>}
              {labelState.success && <Alert kind="success">{labelState.success}</Alert>}
              <input type="hidden" name="orderId" value={props.orderId} />
              <SubmitButton className="btn btn-gold btn-sm w-full" pendingLabel="Purchasing…" disabled={!canPurchase}>
                Buy Shipping Label
              </SubmitButton>
              <p className="text-[0.65rem] leading-relaxed text-muted">
                Purchases a real label from Shippo for the carrier service this order paid for,
                fills in tracking automatically, and marks the order Shipped.
                {!canPurchase && ' Only available once payment is confirmed and the order hasn’t shipped yet.'}
              </p>
            </form>
          )}
        </section>
      )}

      <section className="panel p-4">
        <p className="microlabel">Fulfillment</p>
        <form action={formAction} className="mt-3 space-y-3">
          {state.error && <Alert kind="error">{state.error}</Alert>}
          {state.success && <Alert kind="success">{state.success}</Alert>}
          <input type="hidden" name="orderId" value={props.orderId} />
          <label className="microlabel block">
            Status
            <select name="status" defaultValue={props.status} className="field mt-1.5">
              <option value={props.status}>{props.status.replaceAll('_', ' ')} (current)</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>→ {s.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label className="microlabel block">
            Tracking carrier
            <input name="trackingCarrier" defaultValue={props.trackingCarrier} placeholder="UPS / USPS / FedEx" className="field mt-1.5" />
          </label>
          <label className="microlabel block">
            Tracking number
            <input name="trackingNumber" defaultValue={props.trackingNumber} className="field mt-1.5 font-mono" />
          </label>
          <label className="microlabel block">
            Internal notes
            <textarea name="adminNotes" rows={3} defaultValue={props.adminNotes} className="field mt-1.5" />
          </label>
          <SubmitButton className="btn btn-gold btn-sm w-full" pendingLabel="Saving…">
            Update Order
          </SubmitButton>
          <p className="text-[0.65rem] leading-relaxed text-muted">
            Marking as Shipped sends the customer a shipping notification with tracking. Payment
            status can never be set manually — it comes only from verified payments.
          </p>
        </form>
      </section>

      {props.paymentStatus === 'PAID' && (
        <section className="panel border-danger/30 p-4">
          <p className="microlabel text-danger">Refund</p>
          <form
            action={refundAction}
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              if (!confirm('Refund the full payment for this order via the payment provider?')) {
                e.preventDefault()
              }
            }}
          >
            {refundState.error && <Alert kind="error">{refundState.error}</Alert>}
            {refundState.success && <Alert kind="success">{refundState.success}</Alert>}
            <input type="hidden" name="orderId" value={props.orderId} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="restock" defaultChecked className="h-4 w-4 accent-[#c9a961]" />
              Return items to inventory
            </label>
            <SubmitButton className="btn btn-danger btn-sm w-full" pendingLabel="Refunding…">
              Refund Full Order
            </SubmitButton>
          </form>
        </section>
      )}
    </>
  )
}
