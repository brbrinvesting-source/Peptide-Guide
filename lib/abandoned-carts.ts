import 'server-only'
import { prisma } from './db'
import { getBulkTiers } from './settings'
import { priceLine } from './pricing'
import { getSettings, SETTING_KEYS } from './settings'
import { sendEmail } from './email/provider'
import { abandonedCartEmail } from './email/templates'
import { absoluteUrl } from './site'

/**
 * Process abandoned carts. Invoked by the scheduled job route
 * (/api/cron/abandoned-carts). A cart is abandoned when it is ACTIVE,
 * has items, and has not been touched for the configured delay.
 *
 * Skips carts when: order completed (cart CONVERTED), cart empty, all items
 * unavailable, customer opted out of marketing, or email already sent.
 * Inventory is never reserved for abandoned carts.
 */
export async function processAbandonedCarts(): Promise<{ examined: number; sent: number }> {
  const settings = await getSettings([
    SETTING_KEYS.ABANDONED_CART_DELAY_MINUTES,
    SETTING_KEYS.ABANDONED_CART_SUBJECT,
  ])
  const delayMinutes = parseInt(settings[SETTING_KEYS.ABANDONED_CART_DELAY_MINUTES], 10) || 90
  const cutoff = new Date(Date.now() - delayMinutes * 60 * 1000)

  const carts = await prisma.cart.findMany({
    where: {
      status: 'ACTIVE',
      abandonedEmailSentAt: null,
      updatedAt: { lt: cutoff },
      items: { some: {} },
    },
    include: {
      user: true,
      items: { include: { product: true } },
    },
    take: 100,
  })

  const tiers = await getBulkTiers()
  let sent = 0

  for (const cart of carts) {
    if (cart.user.marketingOptOut || cart.user.disabled || !cart.user.emailVerified) continue

    const availableItems = cart.items.filter(
      (i) => i.product.active && i.product.priceCents !== null && i.product.inventoryQty > 0
    )
    if (availableItems.length === 0) continue

    const lines = availableItems.map((i) => {
      const priced = priceLine(i.product, i.quantity, tiers)
      return {
        name: i.product.name,
        vialSize: i.product.vialSize,
        quantity: i.quantity,
        lineTotalCents: priced.lineTotal,
      }
    })
    const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0)

    const email = abandonedCartEmail({
      subject: settings[SETTING_KEYS.ABANDONED_CART_SUBJECT] || 'You left something behind',
      lines,
      subtotalCents,
      cartUrl: absoluteUrl('/cart'),
    })
    const ok = await sendEmail('ABANDONED_CART', { to: cart.user.email, ...email }, { cartId: cart.id })
    if (ok) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { status: 'ABANDONED_NOTIFIED', abandonedEmailSentAt: new Date() },
      })
      sent++
    }
  }
  return { examined: carts.length, sent }
}
