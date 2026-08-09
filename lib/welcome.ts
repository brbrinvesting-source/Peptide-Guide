import 'server-only'
import { randomBytes } from 'crypto'
import { prisma } from './db'
import { getSettings, SETTING_KEYS } from './settings'
import { sendEmail } from './email/provider'
import { welcomeEmail } from './email/templates'
import { absoluteUrl } from './site'

// Unique, account-linked welcome promotion (default 20% off first order,
// configurable). One per customer, single redemption, enforced server-side
// in validatePromoCode + finalizeOrderPayment.

function generateWelcomeCode(): string {
  // e.g. WELCOME-7K2M9QX4 — unambiguous alphabet
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let suffix = ''
  for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % alphabet.length]
  return `WELCOME-${suffix}`
}

export async function createAndSendWelcomePromotion(userId: string): Promise<void> {
  const settings = await getSettings([
    SETTING_KEYS.WELCOME_PROMO_ENABLED,
    SETTING_KEYS.WELCOME_DISCOUNT_PERCENT,
  ])
  if (settings[SETTING_KEYS.WELCOME_PROMO_ENABLED] !== 'true') return

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.emailVerified) return

  const existing = await prisma.welcomePromotion.findUnique({ where: { userId } })
  if (existing) return // one welcome promotion per customer, ever

  const percent = Math.min(
    90,
    Math.max(1, parseInt(settings[SETTING_KEYS.WELCOME_DISCOUNT_PERCENT], 10) || 20)
  )

  let code = generateWelcomeCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.promoCode.findUnique({ where: { code } })
    if (!clash) break
    code = generateWelcomeCode()
  }

  const wp = await prisma.$transaction(async (tx) => {
    const promo = await tx.promoCode.create({
      data: {
        code,
        description: `Welcome promotion for ${user.email}`,
        discountType: 'PERCENT',
        discountValue: percent,
        active: true,
        isWelcomeCode: true,
        restrictedToUserId: userId,
        maxTotalUses: 1,
        perCustomerLimit: 1,
      },
    })
    return tx.welcomePromotion.create({
      data: { userId, promoCodeId: promo.id, discountPercent: percent },
    })
  })

  const email = welcomeEmail({ code, percent, catalogUrl: absoluteUrl('/catalog') })
  const sent = await sendEmail('WELCOME', { to: user.email, ...email }, { userId })
  if (sent) {
    await prisma.welcomePromotion.update({ where: { id: wp.id }, data: { sentAt: new Date() } })
  }
}
