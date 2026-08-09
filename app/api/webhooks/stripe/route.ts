import { NextRequest, NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/payments/provider'
import {
  finalizeOrderPayment,
  markPaymentFailed,
  markPaymentProcessing,
  recordRefund,
} from '@/lib/orders'

// Stripe webhook endpoint. Signature is cryptographically verified before any
// event is processed; unverifiable requests are rejected.

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const rawBody = await req.text()
  const event = await getPaymentProvider().parseWebhookEvent(rawBody, signature)
  if (!event) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  try {
    switch (event.type) {
      case 'payment.succeeded':
        if (event.providerPaymentId) await finalizeOrderPayment(event.providerPaymentId)
        break
      case 'payment.failed':
        if (event.providerPaymentId) {
          await markPaymentFailed(event.providerPaymentId, event.errorMessage ?? 'Payment failed')
        }
        break
      case 'payment.processing':
        if (event.providerPaymentId) await markPaymentProcessing(event.providerPaymentId)
        break
      case 'refund.updated':
        if (event.providerPaymentId && event.refundedCents !== undefined) {
          await recordRefund(event.providerPaymentId, event.refundedCents)
        }
        break
      default:
        break
    }
  } catch (err) {
    console.error('webhook processing error', err)
    // 500 signals the provider to retry the delivery.
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
