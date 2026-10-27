import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Neon's serverless driver, via Prisma's driver adapter, instead of a raw
// Postgres connection. Netlify Database (built-in, Neon-based) gives this
// app exactly one connection string — no separate pooled/direct pair to
// choose between — so the thing that actually matters here is *how* the
// app holds that connection open. Prisma's default engine keeps a
// persistent connection pool alive for as long as the process runs, which
// on a warm serverless function container can be far longer than any real
// request activity — long enough to keep Neon's auto-suspend from ever
// triggering. The Neon adapter is built for serverless lifecycles instead.
//
// WebSocket (not plain HTTP) mode is required here specifically because
// this app uses prisma.$transaction(...) extensively (order creation,
// refunds, points) — Neon's stateless HTTP mode can't support that.
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
