import 'server-only'
import { prisma } from './db'
import { getSettings, SETTING_KEYS } from './settings'
import { pointsRedemptionValueCents } from './points'
import { sendEmail } from './email/provider'
import { pointsReminderEmail } from './email/templates'
import { absoluteUrl } from './site'

/**
 * Periodic "you have points waiting" reminder. Invoked by the scheduled job
 * route (/api/cron/points-reminder), which runs daily — each customer is
 * only actually emailed once every POINTS_REMINDER_INTERVAL_DAYS, tracked
 * via User.lastPointsReminderSentAt.
 *
 * Skips: reminder disabled, points program disabled, balance below the
 * configured minimum, marketing opt-out, disabled/unverified accounts, and
 * anyone reminded within the configured interval already.
 */
export async function processPointsReminders(): Promise<{ examined: number; sent: number }> {
  const settings = await getSettings([
    SETTING_KEYS.POINTS_REMINDER_ENABLED,
    SETTING_KEYS.POINTS_PROGRAM_ENABLED,
    SETTING_KEYS.POINTS_REMINDER_INTERVAL_DAYS,
    SETTING_KEYS.POINTS_REMINDER_MIN_POINTS,
    SETTING_KEYS.POINTS_REDEMPTION_PER_DOLLAR,
  ])
  if (settings[SETTING_KEYS.POINTS_REMINDER_ENABLED] !== 'true') return { examined: 0, sent: 0 }
  if (settings[SETTING_KEYS.POINTS_PROGRAM_ENABLED] !== 'true') return { examined: 0, sent: 0 }

  const intervalDays = parseInt(settings[SETTING_KEYS.POINTS_REMINDER_INTERVAL_DAYS], 10) || 30
  const minPoints = parseInt(settings[SETTING_KEYS.POINTS_REMINDER_MIN_POINTS], 10) || 10
  const redemptionPerDollar = parseInt(settings[SETTING_KEYS.POINTS_REDEMPTION_PER_DOLLAR], 10) || 1
  const cutoff = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      pointsBalance: { gte: minPoints },
      marketingOptOut: false,
      disabled: false,
      emailVerified: true,
      OR: [{ lastPointsReminderSentAt: null }, { lastPointsReminderSentAt: { lt: cutoff } }],
    },
    select: { id: true, email: true, firstName: true, pointsBalance: true },
    take: 500,
  })

  let sent = 0
  for (const user of users) {
    const email = pointsReminderEmail({
      firstName: user.firstName,
      points: user.pointsBalance,
      valueCents: pointsRedemptionValueCents(user.pointsBalance, redemptionPerDollar),
      accountUrl: absoluteUrl('/account'),
    })
    const ok = await sendEmail('POINTS_REMINDER', { to: user.email, ...email }, { userId: user.id })
    if (ok) {
      await prisma.user.update({ where: { id: user.id }, data: { lastPointsReminderSentAt: new Date() } })
      sent++
    }
  }
  return { examined: users.length, sent }
}
