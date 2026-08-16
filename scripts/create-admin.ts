import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Secure initial Super Admin setup. Credentials come from environment
// variables (never hard-coded):
//
//   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD='...' npm run create-admin
//
// If the user already exists it is promoted to SUPER_ADMIN instead.

const prisma = new PrismaClient()

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.INITIAL_ADMIN_PASSWORD

  if (!email || !password) {
    console.log('Skipping admin bootstrap: INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set.')
    process.exit(0)
  }
  if (password.length < 12) {
    console.error('Admin password must be at least 12 characters.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'SUPER_ADMIN', emailVerified: true, emailVerifiedAt: new Date() },
    })
    console.log(`Existing user ${email} promoted to SUPER_ADMIN.`)
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    })
    console.log(`Super Admin ${email} created.`)
  }
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_BOOTSTRAP',
      objectType: 'User',
      after: JSON.stringify({ email, role: 'SUPER_ADMIN' }),
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
