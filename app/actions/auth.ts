'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  consumeAuthToken,
  createAuthToken,
  createSession,
  destroyAllSessions,
  destroySession,
  getCurrentUser,
  hashPassword,
  requestMeta,
  verifyPassword,
} from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/provider'
import { passwordResetEmail, verificationEmail } from '@/lib/email/templates'
import { absoluteUrl } from '@/lib/site'
import { createAndSendWelcomePromotion } from '@/lib/welcome'
import { audit } from '@/lib/audit'
import { getSetting, SETTING_KEYS } from '@/lib/settings'

export interface FormState {
  error?: string
  success?: string
}

const emailSchema = z.string().trim().toLowerCase().email().max(254)
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(200)

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta()
  if (!rateLimit(`register:${meta.ip}`, 5, 60 * 60 * 1000)) {
    return { error: 'Too many registration attempts. Please try again later.' }
  }

  const parsedEmail = emailSchema.safeParse(formData.get('email'))
  if (!parsedEmail.success) return { error: 'Please enter a valid email address.' }
  const parsedPassword = passwordSchema.safeParse(formData.get('password'))
  if (!parsedPassword.success) return { error: parsedPassword.error.issues[0].message }
  if (formData.get('password') !== formData.get('confirmPassword')) {
    return { error: 'Passwords do not match.' }
  }
  if (formData.get('researcherAttestation') !== 'on') {
    return {
      error:
        'You must certify that you are registering as a researcher to create an account.',
    }
  }

  const email = parsedEmail.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'An account with this email already exists. Try logging in instead.' }
  }

  const attestationVersion = await getSetting(SETTING_KEYS.RESEARCHER_ATTESTATION_VERSION)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(parsedPassword.data),
      researcherAttestedAt: new Date(),
      researcherAttestationVersion: attestationVersion,
    },
  })
  await audit({
    userId: user.id,
    action: 'RESEARCHER_ATTESTATION_ACCEPTED',
    objectType: 'User',
    objectId: user.id,
    after: { version: attestationVersion },
    ip: meta.ip,
  })

  const token = await createAuthToken(user.id, 'EMAIL_VERIFICATION', 60 * 24)
  const emailContent = verificationEmail(absoluteUrl(`/verify-email?token=${token}`))
  await sendEmail('VERIFICATION', { to: email, ...emailContent }, { userId: user.id })

  redirect('/verify-email/pending?registered=1')
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta()
  const parsedEmail = emailSchema.safeParse(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  if (!parsedEmail.success || !password) return { error: 'Invalid email or password.' }

  if (
    !rateLimit(`login:${meta.ip}`, 10, 15 * 60 * 1000) ||
    !rateLimit(`login:${parsedEmail.data}`, 10, 15 * 60 * 1000)
  ) {
    return { error: 'Too many login attempts. Please wait a few minutes and try again.' }
  }

  const user = await prisma.user.findUnique({ where: { email: parsedEmail.data } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Invalid email or password.' }
  }
  if (user.disabled) {
    return { error: 'This account has been disabled. Contact support for assistance.' }
  }

  await createSession(user.id)

  if (!user.emailVerified) redirect('/verify-email/pending')
  const next = String(formData.get('next') ?? '')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/catalog')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/')
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.emailVerified) redirect('/catalog')
  if (!rateLimit(`resend-verify:${user.id}`, 3, 60 * 60 * 1000)) {
    return { error: 'Too many requests. Please wait before requesting another email.' }
  }
  const token = await createAuthToken(user.id, 'EMAIL_VERIFICATION', 60 * 24)
  const emailContent = verificationEmail(absoluteUrl(`/verify-email?token=${token}`))
  await sendEmail('VERIFICATION', { to: user.email, ...emailContent }, { userId: user.id })
  return { success: 'Verification email sent. Check your inbox.' }
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const userId = await consumeAuthToken(token, 'EMAIL_VERIFICATION')
  if (!userId) return false
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return false
  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    })
    // Welcome email + unique account-linked first-order discount.
    await createAndSendWelcomePromotion(userId).catch((err) =>
      console.error('welcome promotion failed', err)
    )
  }
  return true
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta()
  if (!rateLimit(`forgot:${meta.ip}`, 5, 60 * 60 * 1000)) {
    return { error: 'Too many requests. Please try again later.' }
  }
  const parsedEmail = emailSchema.safeParse(formData.get('email'))
  // Always report success — never reveal whether an account exists.
  const genericSuccess = {
    success: 'If an account exists for that address, a reset link has been sent.',
  }
  if (!parsedEmail.success) return genericSuccess
  const user = await prisma.user.findUnique({ where: { email: parsedEmail.data } })
  if (user && !user.disabled) {
    const token = await createAuthToken(user.id, 'PASSWORD_RESET', 60)
    const emailContent = passwordResetEmail(absoluteUrl(`/reset-password?token=${token}`))
    await sendEmail('PASSWORD_RESET', { to: user.email, ...emailContent }, { userId: user.id })
  }
  return genericSuccess
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get('token') ?? '')
  const parsedPassword = passwordSchema.safeParse(formData.get('password'))
  if (!parsedPassword.success) return { error: parsedPassword.error.issues[0].message }
  if (formData.get('password') !== formData.get('confirmPassword')) {
    return { error: 'Passwords do not match.' }
  }
  const userId = await consumeAuthToken(token, 'PASSWORD_RESET')
  if (!userId) return { error: 'This reset link is invalid or has expired. Request a new one.' }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsedPassword.data) },
  })
  await destroyAllSessions(userId)
  await audit({ userId, action: 'PASSWORD_RESET', objectType: 'User', objectId: userId })
  redirect('/login?reset=1')
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const current = String(formData.get('currentPassword') ?? '')
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: 'Current password is incorrect.' }
  }
  const parsedPassword = passwordSchema.safeParse(formData.get('password'))
  if (!parsedPassword.success) return { error: parsedPassword.error.issues[0].message }
  if (formData.get('password') !== formData.get('confirmPassword')) {
    return { error: 'Passwords do not match.' }
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsedPassword.data) },
  })
  await audit({ userId: user.id, action: 'PASSWORD_CHANGED', objectType: 'User', objectId: user.id })
  return { success: 'Password updated.' }
}

export async function updateAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const firstName = String(formData.get('firstName') ?? '').trim().slice(0, 80) || null
  const lastName = String(formData.get('lastName') ?? '').trim().slice(0, 80) || null
  const marketingOptOut = formData.get('marketingOptOut') === 'on'
  await prisma.user.update({
    where: { id: user.id },
    data: { firstName, lastName, marketingOptOut },
  })
  return { success: 'Account updated.' }
}
