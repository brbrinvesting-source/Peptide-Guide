import 'server-only'
import Stripe from 'stripe'
import type {
  CreatePaymentParams,
  PaymentIntentResult,
  PaymentProviderAdapter,
  ProviderWebhookEvent,
  RefundResult,
  VerifiedPayment,
} from './provider'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

function mapIntentStatus(status: Stripe.PaymentIntent.Status): VerifiedPayment['status'] {
  switch (status) {
    case 'succeeded':
      return 'PAID'
    case 'processing':
      return 'PROCESSING'
    case 'canceled':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

export const stripeAdapter: PaymentProviderAdapter = {
  name: 'stripe',

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntentResult> {
    const intent = await getStripe().paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency,
      receipt_email: params.customerEmail,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        ...params.metadata,
      },
    })
    if (!intent.client_secret) throw new Error('Stripe did not return a client secret')
    return { providerPaymentId: intent.id, clientSecret: intent.client_secret }
  },

  async verifyPayment(providerPaymentId: string): Promise<VerifiedPayment> {
    const intent = await getStripe().paymentIntents.retrieve(providerPaymentId)
    return {
      providerPaymentId: intent.id,
      status: mapIntentStatus(intent.status),
      amountCents: intent.amount,
      currency: intent.currency,
    }
  },

  async refund(providerPaymentId: string, amountCents?: number): Promise<RefundResult> {
    const refund = await getStripe().refunds.create({
      payment_intent: providerPaymentId,
      ...(amountCents !== undefined ? { amount: amountCents } : {}),
    })
    return { refundedCents: refund.amount }
  },

  async parseWebhookEvent(rawBody: string, signature: string): Promise<ProviderWebhookEvent | null> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured; rejecting webhook')
      return null
    }
    let event: Stripe.Event
    try {
      event = await getStripe().webhooks.constructEventAsync(rawBody, signature, secret)
    } catch {
      return null
    }
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        return { type: 'payment.succeeded', providerPaymentId: pi.id, amountCents: pi.amount }
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        return {
          type: 'payment.failed',
          providerPaymentId: pi.id,
          errorMessage: pi.last_payment_error?.message ?? 'Payment failed',
        }
      }
      case 'payment_intent.processing': {
        const pi = event.data.object as Stripe.PaymentIntent
        return { type: 'payment.processing', providerPaymentId: pi.id }
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null
        return {
          type: 'refund.updated',
          providerPaymentId: piId,
          refundedCents: charge.amount_refunded,
        }
      }
      default:
        return { type: 'other', providerPaymentId: null }
    }
  },
}
