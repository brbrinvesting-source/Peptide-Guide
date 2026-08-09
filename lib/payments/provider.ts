import 'server-only'

// Payment provider abstraction. Stripe is the current implementation, but
// all checkout/webhook code depends only on this interface so the provider
// can be replaced without touching business logic.

export interface CreatePaymentParams {
  amountCents: number
  currency: string
  orderId: string
  orderNumber: string
  customerEmail: string
  metadata?: Record<string, string>
}

export interface PaymentIntentResult {
  providerPaymentId: string
  clientSecret: string
}

export interface VerifiedPayment {
  providerPaymentId: string
  status: 'PAID' | 'PROCESSING' | 'FAILED' | 'PENDING'
  amountCents: number
  currency: string
}

export interface RefundResult {
  refundedCents: number
}

export interface PaymentProviderAdapter {
  readonly name: string
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntentResult>
  /** Server-side verification of a payment's true status — never trust the client. */
  verifyPayment(providerPaymentId: string): Promise<VerifiedPayment>
  refund(providerPaymentId: string, amountCents?: number): Promise<RefundResult>
  /** Verify a webhook signature and return the parsed event, or null if invalid. */
  parseWebhookEvent(rawBody: string, signature: string): Promise<ProviderWebhookEvent | null>
}

export interface ProviderWebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.processing' | 'refund.updated' | 'other'
  providerPaymentId: string | null
  amountCents?: number
  errorMessage?: string
  refundedCents?: number
}

import { stripeAdapter } from './stripe'

export function getPaymentProvider(): PaymentProviderAdapter {
  // Future providers can be selected via PAYMENT_PROVIDER env var.
  return stripeAdapter
}
