import 'server-only'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import type { Role } from './constants'
import type { User } from '@prisma/client'

const SESSION_COOKIE = 'aap_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14 // 14 days

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers()
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent')?.slice(0, 255) ?? null,
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = generateToken()
  const meta = await requestMeta()
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
  cookieStore.delete(SESSION_COOKIE)
}

/** Delete all sessions for a user (e.g. after password reset). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  if (session.user.disabled) return null
  return session.user
})

/** Require a logged-in, email-verified customer. Redirects otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.emailVerified) redirect('/verify-email/pending')
  return user
}

export function isAdminRole(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

/** Require an admin (or super admin). Redirects otherwise. */
export async function requireAdmin(minRole: Role = 'ADMIN'): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin')
  if (minRole === 'SUPER_ADMIN' ? user.role !== 'SUPER_ADMIN' : !isAdminRole(user.role)) {
    redirect('/')
  }
  return user
}

/** Non-redirecting admin check for API routes. */
export async function getAdminOrNull(minRole: Role = 'ADMIN'): Promise<User | null> {
  const user = await getCurrentUser()
  if (!user) return null
  if (minRole === 'SUPER_ADMIN' ? user.role !== 'SUPER_ADMIN' : !isAdminRole(user.role)) {
    return null
  }
  return user
}

// --- one-time tokens (email verification / password reset) ---

export async function createAuthToken(
  userId: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ttlMinutes: number
): Promise<string> {
  const token = generateToken()
  // Invalidate older tokens of the same type
  await prisma.authToken.deleteMany({ where: { userId, type } })
  await prisma.authToken.create({
    data: {
      tokenHash: hashToken(token),
      type,
      userId,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  })
  return token
}

export async function consumeAuthToken(
  token: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
): Promise<string | null> {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null
  await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  return row.userId
}
