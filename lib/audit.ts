import 'server-only'
import { prisma } from './db'

export async function audit(params: {
  userId?: string | null
  action: string
  objectType: string
  objectId?: string | null
  before?: unknown
  after?: unknown
  ip?: string | null
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        objectType: params.objectType,
        objectId: params.objectId ?? null,
        before: params.before === undefined ? null : JSON.stringify(params.before),
        after: params.after === undefined ? null : JSON.stringify(params.after),
        ip: params.ip ?? null,
      },
    })
  } catch (err) {
    // Auditing must never break the primary operation.
    console.error('audit log write failed', err)
  }
}
