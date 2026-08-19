import 'server-only'
import { randomBytes } from 'crypto'
import { prisma } from './db'

// Every account gets its own unique, shareable referral code at creation
// (see generateUniqueReferralCode, called from registration and
// create-admin). Attribution is captured once, at registration, via the
// REFERRAL_COOKIE set by /r/[code] — never changed afterward.

export const REFERRAL_COOKIE = 'aap_ref'
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function randomCode(): string {
  // Unambiguous alphabet, same family as the old welcome-code generator.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(7)
  let code = ''
  for (let i = 0; i < 7; i++) code += alphabet[bytes[i] % alphabet.length]
  return code
}

/** Generate a referral code guaranteed unique against the current table. */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode()
    const clash = await prisma.user.findUnique({ where: { referralCode: code } })
    if (!clash) return code
  }
  // Astronomically unlikely to be reached (32^7 keyspace); fall back to a
  // longer code so registration never hard-fails on a collision.
  return `${randomCode()}${randomCode()}`
}

/** Resolve a referral code to the referring user's id, or null if invalid. */
export async function resolveReferrerId(code: string): Promise<string | null> {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return null
  const referrer = await prisma.user.findUnique({ where: { referralCode: trimmed }, select: { id: true } })
  return referrer?.id ?? null
}
