import 'server-only'
import { prisma } from './db'
import { getSettings, SETTING_KEYS } from './settings'
import { sendEmail } from './email/provider'
import { welcomeEmail } from './email/templates'
import { absoluteUrl } from './site'

// Shared, fixed welcome code (e.g. WELCOME20, configurable in Admin ->
// Settings). Every verified customer is emailed the same code, but each
// account may redeem it at most once — enforced via the code's
// perCustomerLimit + PromoRedemption, same as any other promo code.

async function getOrCreateWelcomePromoCode(percent: number, codeSetting: string) {
  const code = codeSetting.trim().toUpperCase() || 'WELCOME20'
  const existing = await prisma.promoCode.findUnique({ where: { code } })
  if (existing) return existing
  return prisma.promoCode.create({
    data: {
      code,
      description: 'Welcome discount for new verified customers',
      discountType: 'PERCENT',
      discountValue: percent,
      active: true,
      isWelcomeCode: true,
      maxTotalUses: null,
      perCustomerLimit: 1,
    },
  })
}

export async function createAndSendWelcomePromotion(userId: string): Promise<void> {
  const settings = await getSettings([
    SETTING_KEYS.WELCOME_PROMO_ENABLED,
    SETTING_KEYS.WELCOME_DISCOUNT_PERCENT,
    SETTING_KEYS.WELCOME_PROMO_CODE,
  ])
  if (settings[SETTING_KEYS.WELCOME_PROMO_ENABLED] !== 'true') return

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.emailVerified) return

  const existing = await prisma.welcomePromotion.findUnique({ where: { userId } })
  if (existing) return // one welcome email per customer, ever

  const percent = Math.min(
    90,
    Math.max(1, parseInt(settings[SETTING_KEYS.WELCOME_DISCOUNT_PERCENT], 10) || 20)
  )

  const promo = await getOrCreateWelcomePromoCode(percent, settings[SETTING_KEYS.WELCOME_PROMO_CODE])

  const wp = await prisma.welcomePromotion.create({
    data: { userId, promoCodeId: promo.id, discountPercent: promo.discountValue },
  })

  const email = welcomeEmail({ code: promo.code, percent: promo.discountValue, catalogUrl: absoluteUrl('/catalog') })
  const sent = await sendEmail('WELCOME', { to: user.email, ...email }, { userId })
  if (sent) {
    await prisma.welcomePromotion.update({ where: { id: wp.id }, data: { sentAt: new Date() } })
  }
}
