'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin, requestMeta } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { getSetting, setSetting, SETTING_KEYS } from '@/lib/settings'
import { getPaymentProvider } from '@/lib/payments/provider'
import { sendEmail } from '@/lib/email/provider'
import { orderStatusEmail, shippingNotificationEmail } from '@/lib/email/templates'
import { absoluteUrl } from '@/lib/site'
import { INVENTORY_REASONS } from '@/lib/constants'
import { storeFile } from '@/lib/storage'

export interface AdminActionState {
  error?: string
  success?: string
}

function str(fd: FormData, key: string, max = 500): string {
  return String(fd.get(key) ?? '').trim().slice(0, max)
}

function intOrNull(fd: FormData, key: string): number | null {
  const raw = str(fd, key)
  if (raw === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function floatOrNull(fd: FormData, key: string): number | null {
  const raw = str(fd, key)
  if (raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Parse dollars text ("129.99") to cents. Returns null for empty. */
function dollarsToCents(raw: string): number | null {
  if (raw === '') return null
  const n = Number(raw.replace(/[$,\s]/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function saveProductAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')

  const name = str(formData, 'name', 160)
  const sku = str(formData, 'sku', 60).toUpperCase()
  const vialSize = str(formData, 'vialSize', 60)
  const categoryId = str(formData, 'categoryId')
  if (!name || !sku || !vialSize || !categoryId) {
    return { error: 'Name, SKU, vial size, and category are required.' }
  }

  const priceCents = dollarsToCents(str(formData, 'price'))
  if (str(formData, 'price') !== '' && priceCents === null) {
    return { error: 'Price must be a valid dollar amount.' }
  }
  const lowStockThreshold = intOrNull(formData, 'lowStockThreshold') ?? 5
  const sortOrder = intOrNull(formData, 'sortOrder') ?? 0
  const weightOz = floatOrNull(formData, 'weightOz')
  if (weightOz !== null && weightOz <= 0) {
    return { error: 'Shipping weight must be greater than zero.' }
  }

  const data = {
    name,
    sku,
    vialSize,
    categoryId,
    priceCents,
    weightOz: weightOz ?? 4,
    lowStockThreshold: Math.max(0, lowStockThreshold),
    sortOrder,
    description: str(formData, 'description', 8000) || null,
    specifications: str(formData, 'specifications', 8000) || null,
    active: formData.get('active') === 'on',
    featured: formData.get('featured') === 'on',
    coaComingSoon: formData.get('coaComingSoon') === 'on',
  }

  const meta = await requestMeta()

  if (id) {
    const before = await prisma.product.findUnique({ where: { id } })
    if (!before) return { error: 'Product not found.' }
    const skuClash = await prisma.product.findFirst({ where: { sku, id: { not: id } } })
    if (skuClash) return { error: `SKU ${sku} is already used by another product.` }
    const updated = await prisma.product.update({ where: { id }, data })
    await audit({
      userId: admin.id,
      action: before.priceCents !== updated.priceCents ? 'PRICE_CHANGED' : 'PRODUCT_UPDATED',
      objectType: 'Product',
      objectId: id,
      before: { name: before.name, sku: before.sku, priceCents: before.priceCents, active: before.active },
      after: { name: updated.name, sku: updated.sku, priceCents: updated.priceCents, active: updated.active },
      ip: meta.ip,
    })
  } else {
    const skuClash = await prisma.product.findUnique({ where: { sku } })
    if (skuClash) return { error: `SKU ${sku} already exists.` }
    let slug = slugify(`${name} ${vialSize}`)
    if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${sku.toLowerCase()}`
    const created = await prisma.product.create({ data: { ...data, slug } })
    await audit({
      userId: admin.id,
      action: 'PRODUCT_CREATED',
      objectType: 'Product',
      objectId: created.id,
      after: { name, sku, priceCents },
      ip: meta.ip,
    })
    // Initial inventory via the inventory-transaction path
    const initialQty = intOrNull(formData, 'initialInventory')
    if (initialQty && initialQty > 0) {
      await prisma.$transaction([
        prisma.product.update({ where: { id: created.id }, data: { inventoryQty: initialQty } }),
        prisma.inventoryTransaction.create({
          data: {
            productId: created.id,
            previousQty: 0,
            newQty: initialQty,
            delta: initialQty,
            reason: 'INITIAL',
            adminId: admin.id,
          },
        }),
      ])
    }
    revalidatePath('/admin/products')
    redirect(`/admin/products/${created.id}?saved=1`)
  }

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { success: 'Product saved.' }
}

export async function setProductImageAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const productId = str(formData, 'productId')
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { error: 'Product not found.' }

  const url = str(formData, 'imageUrl', 1000)
  const file = formData.get('imageFile') as File | null

  let finalUrl = url
  if (file && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return { error: 'Image must be under 8 MB.' }
    const allowed: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/avif': '.avif',
    }
    const ext = allowed[file.type]
    if (!ext) return { error: 'Image must be JPEG, PNG, WebP, or AVIF.' }
    const buffer = Buffer.from(await file.arrayBuffer())
    const { writeFile, mkdir } = await import('fs/promises')
    const path = await import('path')
    const dir = path.join(process.cwd(), 'public', 'uploads', 'products')
    await mkdir(dir, { recursive: true })
    const filename = `${product.sku.toLowerCase()}-${Date.now()}${ext}`
    await writeFile(path.join(dir, filename), buffer)
    finalUrl = `/uploads/products/${filename}`
  }
  if (!finalUrl) return { error: 'Provide an image file or URL.' }

  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.create({
      data: {
        productId,
        url: finalUrl,
        alt: `${product.name} — ${product.vialSize}`,
        isPrimary: true,
      },
    }),
  ])
  await audit({
    userId: admin.id,
    action: 'PRODUCT_IMAGE_UPDATED',
    objectType: 'Product',
    objectId: productId,
    after: { url: finalUrl },
  })
  revalidatePath('/catalog')
  revalidatePath(`/admin/products/${productId}`)
  return { success: 'Primary image updated.' }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategoryAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')
  const name = str(formData, 'name', 120)
  if (!name) return { error: 'Category name is required.' }
  const sortOrder = intOrNull(formData, 'sortOrder') ?? 0
  const active = formData.get('active') === 'on'

  if (id) {
    await prisma.category.update({ where: { id }, data: { name, sortOrder, active } })
    await audit({ userId: admin.id, action: 'CATEGORY_UPDATED', objectType: 'Category', objectId: id, after: { name, active } })
  } else {
    let slug = slugify(name)
    if (await prisma.category.findUnique({ where: { slug } })) slug = `${slug}-${Date.now() % 10000}`
    const created = await prisma.category.create({ data: { name, slug, sortOrder, active } })
    await audit({ userId: admin.id, action: 'CATEGORY_CREATED', objectType: 'Category', objectId: created.id, after: { name } })
  }
  revalidatePath('/admin/categories')
  return { success: 'Category saved.' }
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function adjustInventoryAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const productId = str(formData, 'productId')
  const newQty = intOrNull(formData, 'newQty')
  const reason = str(formData, 'reason', 40)
  const note = str(formData, 'note', 500) || null

  if (newQty === null || newQty < 0) return { error: 'Enter a valid quantity (0 or more).' }
  if (!(INVENTORY_REASONS as readonly string[]).includes(reason)) {
    return { error: 'Select a valid reason.' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Product not found.')
      await tx.product.update({ where: { id: productId }, data: { inventoryQty: newQty } })
      await tx.inventoryTransaction.create({
        data: {
          productId,
          previousQty: product.inventoryQty,
          newQty,
          delta: newQty - product.inventoryQty,
          reason,
          note,
          adminId: admin.id,
        },
      })
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Adjustment failed.' }
  }
  await audit({
    userId: admin.id,
    action: 'INVENTORY_ADJUSTED',
    objectType: 'Product',
    objectId: productId,
    after: { newQty, reason, note },
  })
  revalidatePath('/admin/inventory')
  revalidatePath('/catalog')
  return { success: 'Inventory updated.' }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['FULFILLED'],
  FULFILLED: [],
  PENDING: ['CANCELLED'],
  PAYMENT_PROCESSING: [],
  CANCELLED: [],
  REFUNDED: [],
}

export async function updateOrderAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const orderId = str(formData, 'orderId')
  const newStatus = str(formData, 'status', 40)
  const trackingNumber = str(formData, 'trackingNumber', 100) || null
  const trackingCarrier = str(formData, 'trackingCarrier', 60) || null
  const adminNotes = str(formData, 'adminNotes', 2000) || null

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) return { error: 'Order not found.' }

  const statusChanged = newStatus && newStatus !== order.status
  if (statusChanged) {
    const allowed = FULFILLMENT_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(newStatus)) {
      return { error: `Cannot move an order from ${order.status} to ${newStatus}.` }
    }
    // Admins can never fabricate payment: PAID is only ever set by verified
    // payment finalization, and unpaid orders cannot enter fulfillment.
    if (['PROCESSING', 'SHIPPED', 'FULFILLED'].includes(newStatus) && order.paymentStatus !== 'PAID') {
      return { error: 'This order has no confirmed payment and cannot be fulfilled.' }
    }
  }

  const data: Record<string, unknown> = { trackingNumber, trackingCarrier, adminNotes }
  if (statusChanged) {
    data.status = newStatus
    if (newStatus === 'SHIPPED') data.shippedAt = new Date()
    if (newStatus === 'FULFILLED') data.fulfilledAt = new Date()
    if (newStatus === 'CANCELLED') data.cancelledAt = new Date()
  }
  await prisma.order.update({ where: { id: orderId }, data })
  await audit({
    userId: admin.id,
    action: 'ORDER_UPDATED',
    objectType: 'Order',
    objectId: orderId,
    before: { status: order.status, trackingNumber: order.trackingNumber },
    after: { status: newStatus || order.status, trackingNumber },
  })

  if (statusChanged) {
    const orderUrl = absoluteUrl(`/account/orders/${orderId}`)
    if (newStatus === 'SHIPPED') {
      const email = shippingNotificationEmail({
        orderNumber: order.orderNumber,
        trackingNumber,
        trackingCarrier,
        orderUrl,
      })
      await sendEmail('SHIPPING_NOTIFICATION', { to: order.customerEmail, ...email }, { orderId })
    } else if (['PROCESSING', 'FULFILLED', 'CANCELLED'].includes(newStatus)) {
      const email = orderStatusEmail({ orderNumber: order.orderNumber, status: newStatus, orderUrl })
      await sendEmail('ORDER_STATUS', { to: order.customerEmail, ...email }, { orderId })
    }
  }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  return { success: 'Order updated.' }
}

export async function refundOrderAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const orderId = str(formData, 'orderId')
  const restock = formData.get('restock') === 'on'

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true, items: true },
  })
  if (!order) return { error: 'Order not found.' }
  if (order.paymentStatus !== 'PAID') return { error: 'Only paid orders can be refunded.' }
  const payment = order.payments.find((p) => p.status === 'PAID')
  if (!payment) return { error: 'No confirmed payment found for this order.' }

  try {
    await getPaymentProvider().refund(payment.providerPaymentId)
  } catch (err) {
    console.error('refund failed', err)
    return { error: 'The payment provider rejected the refund. Check the provider dashboard.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', refundedCents: payment.amountCents },
    })
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
    })
    if (restock) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) continue
        await tx.product.update({
          where: { id: item.productId },
          data: { inventoryQty: { increment: item.quantity } },
        })
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            previousQty: product.inventoryQty,
            newQty: product.inventoryQty + item.quantity,
            delta: item.quantity,
            reason: 'REFUND_RESTOCK',
            note: `Refund of order ${order.orderNumber}`,
            orderId,
            adminId: admin.id,
          },
        })
      }
    }
  })
  await audit({
    userId: admin.id,
    action: 'ORDER_REFUNDED',
    objectType: 'Order',
    objectId: orderId,
    after: { amountCents: payment.amountCents, restock },
  })
  revalidatePath(`/admin/orders/${orderId}`)
  return { success: 'Order refunded.' }
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

export async function savePromoAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')
  const code = str(formData, 'code', 40).toUpperCase().replace(/\s+/g, '')
  if (!code || code.length < 3) return { error: 'Code must be at least 3 characters.' }

  const discountType = str(formData, 'discountType') === 'FIXED' ? 'FIXED' : 'PERCENT'
  let discountValue: number
  if (discountType === 'PERCENT') {
    discountValue = intOrNull(formData, 'discountValue') ?? 0
    if (discountValue < 1 || discountValue > 100) return { error: 'Percent must be 1–100.' }
  } else {
    const cents = dollarsToCents(str(formData, 'discountValue'))
    if (cents === null || cents < 1) return { error: 'Enter a valid dollar discount.' }
    discountValue = cents
  }

  const startsAtRaw = str(formData, 'startsAt')
  const expiresAtRaw = str(formData, 'expiresAt')
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
  if (startsAt && expiresAt && startsAt >= expiresAt) {
    return { error: 'Expiration must be after the start date.' }
  }

  const data = {
    code,
    description: str(formData, 'description', 500) || null,
    discountType,
    discountValue,
    startsAt,
    expiresAt,
    minSubtotalCents: dollarsToCents(str(formData, 'minSubtotal')) ?? 0,
    maxTotalUses: intOrNull(formData, 'maxTotalUses'),
    perCustomerLimit: intOrNull(formData, 'perCustomerLimit'),
    active: formData.get('active') === 'on',
  }

  const clash = await prisma.promoCode.findFirst({
    where: { code, ...(id ? { id: { not: id } } : {}) },
  })
  if (clash) return { error: `Code ${code} already exists.` }

  if (id) {
    const existing = await prisma.promoCode.findUnique({ where: { id } })
    if (!existing) return { error: 'Promo code not found.' }
    if (existing.isWelcomeCode) return { error: 'Welcome codes are managed automatically.' }
    await prisma.promoCode.update({ where: { id }, data })
    await audit({ userId: admin.id, action: 'PROMO_UPDATED', objectType: 'PromoCode', objectId: id, after: data })
  } else {
    const created = await prisma.promoCode.create({ data })
    await audit({ userId: admin.id, action: 'PROMO_CREATED', objectType: 'PromoCode', objectId: created.id, after: data })
  }
  revalidatePath('/admin/promos')
  return { success: 'Promo code saved.' }
}

export async function deletePromoAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')
  const promo = await prisma.promoCode.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  })
  if (!promo || promo.isWelcomeCode) return
  if (promo._count.redemptions > 0) {
    // Preserve history — deactivate instead of destroying redemption records.
    await prisma.promoCode.update({ where: { id }, data: { active: false } })
    await audit({ userId: admin.id, action: 'PROMO_DEACTIVATED', objectType: 'PromoCode', objectId: id })
  } else {
    await prisma.promoCode.delete({ where: { id } })
    await audit({ userId: admin.id, action: 'PROMO_DELETED', objectType: 'PromoCode', objectId: id, before: { code: promo.code } })
  }
  revalidatePath('/admin/promos')
}

// ---------------------------------------------------------------------------
// Shipping methods
// ---------------------------------------------------------------------------

export async function saveShippingMethodAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')
  const name = str(formData, 'name', 120)
  const rateType = str(formData, 'rateType') === 'LIVE_CARRIER' ? 'LIVE_CARRIER' : 'FLAT'
  if (!name) return { error: 'Name is required.' }

  let priceCents = 0
  let carrierServiceToken: string | null = null
  if (rateType === 'FLAT') {
    const parsed = dollarsToCents(str(formData, 'price'))
    if (parsed === null) return { error: 'A valid price is required for a flat-rate method.' }
    priceCents = parsed
  } else {
    carrierServiceToken = str(formData, 'carrierServiceToken', 100)
    if (!carrierServiceToken) return { error: 'A carrier service token is required for a live-rate method.' }
  }

  const data = {
    name,
    rateType,
    carrierServiceToken,
    priceCents,
    deliveryEstimate: str(formData, 'deliveryEstimate', 200) || null,
    active: formData.get('active') === 'on',
    freeShippingEligible: formData.get('freeShippingEligible') === 'on',
    sortOrder: intOrNull(formData, 'sortOrder') ?? 0,
  }
  if (id) {
    await prisma.shippingMethod.update({ where: { id }, data })
  } else {
    await prisma.shippingMethod.create({ data })
  }
  await audit({ userId: admin.id, action: 'SHIPPING_METHOD_SAVED', objectType: 'ShippingMethod', objectId: id || 'new', after: data })
  revalidatePath('/admin/settings/shipping')
  return { success: 'Shipping method saved.' }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const settingsSchema = z.record(z.string(), z.string().max(20000))

export async function saveSettingsAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const entries: Record<string, string> = {}
  const allowedKeys = new Set(Object.values(SETTING_KEYS) as string[])
  for (const [key, value] of formData.entries()) {
    if (allowedKeys.has(key) && typeof value === 'string') entries[key] = value.trim()
  }
  const parsed = settingsSchema.safeParse(entries)
  if (!parsed.success) return { error: 'Invalid settings payload.' }

  // Validate structured settings
  if (SETTING_KEYS.BULK_TIERS in entries) {
    try {
      const tiers = JSON.parse(entries[SETTING_KEYS.BULK_TIERS])
      if (
        !Array.isArray(tiers) ||
        tiers.some(
          (t) =>
            !Number.isInteger(t.minQty) || t.minQty < 2 || !Number.isFinite(t.percentOff) || t.percentOff < 0 || t.percentOff > 90
        )
      ) {
        return { error: 'Bulk tiers must be a list of {minQty ≥ 2, percentOff 0–90}.' }
      }
    } catch {
      return { error: 'Bulk tiers must be valid JSON.' }
    }
  }
  for (const numKey of [
    SETTING_KEYS.FREE_SHIPPING_THRESHOLD_CENTS,
    SETTING_KEYS.WELCOME_DISCOUNT_PERCENT,
    SETTING_KEYS.ABANDONED_CART_DELAY_MINUTES,
    SETTING_KEYS.LOW_STOCK_DEFAULT_THRESHOLD,
    SETTING_KEYS.TAX_FLAT_RATE_BPS,
  ]) {
    if (numKey in entries && entries[numKey] !== '' && !/^\d+$/.test(entries[numKey])) {
      return { error: 'Numeric settings must be whole numbers.' }
    }
  }

  for (const [key, value] of Object.entries(entries)) {
    await setSetting(key, value)
  }

  // Keep the shared welcome PromoCode row (code/discount/active) in sync with
  // Settings, since editing welcome codes directly via Promo Codes is blocked.
  if (
    SETTING_KEYS.WELCOME_PROMO_CODE in entries ||
    SETTING_KEYS.WELCOME_DISCOUNT_PERCENT in entries ||
    SETTING_KEYS.WELCOME_PROMO_ENABLED in entries
  ) {
    const codeStr = (await getSetting(SETTING_KEYS.WELCOME_PROMO_CODE)).trim().toUpperCase()
    const percent = Math.min(90, Math.max(1, parseInt(await getSetting(SETTING_KEYS.WELCOME_DISCOUNT_PERCENT), 10) || 20))
    const enabled = (await getSetting(SETTING_KEYS.WELCOME_PROMO_ENABLED)) === 'true'
    if (codeStr) {
      await prisma.promoCode.upsert({
        where: { code: codeStr },
        update: { discountValue: percent, active: enabled },
        create: {
          code: codeStr,
          description: 'Welcome discount for new verified customers',
          discountType: 'PERCENT',
          discountValue: percent,
          active: enabled,
          isWelcomeCode: true,
          maxTotalUses: null,
          perCustomerLimit: 1,
        },
      })
      // Only one welcome code is "current" at a time — retire any others
      // (e.g. after a rename) without touching their redemption history.
      await prisma.promoCode.updateMany({
        where: { isWelcomeCode: true, code: { not: codeStr } },
        data: { active: false },
      })
    }
  }

  await audit({ userId: admin.id, action: 'SETTINGS_CHANGED', objectType: 'SiteSetting', after: entries })
  revalidatePath('/', 'layout')
  return { success: 'Settings saved.' }
}

export async function saveContentPageAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const slug = str(formData, 'slug', 60)
  const title = str(formData, 'title', 200)
  const body = String(formData.get('body') ?? '').slice(0, 100_000)
  const version = str(formData, 'version', 20) || '1.0'
  if (!slug || !title || !body) return { error: 'Title and body are required.' }
  const existing = await prisma.contentPage.findUnique({ where: { slug } })
  if (!existing) return { error: 'Unknown page.' }
  await prisma.contentPage.update({ where: { slug }, data: { title, body, version } })
  if (slug === 'research-disclaimer') {
    await setSetting(SETTING_KEYS.DISCLAIMER_VERSION, version)
  }
  await audit({ userId: admin.id, action: 'CONTENT_PAGE_UPDATED', objectType: 'ContentPage', objectId: slug, after: { title, version } })
  revalidatePath(`/legal/${slug}`)
  return { success: 'Page saved.' }
}

// ---------------------------------------------------------------------------
// COAs
// ---------------------------------------------------------------------------

export async function uploadCoaAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const productId = str(formData, 'productId')
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { error: 'Select a product.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Attach a COA document (PDF).' }
  if (file.size > 20 * 1024 * 1024) return { error: 'File must be under 20 MB.' }
  if (file.type !== 'application/pdf') return { error: 'COA documents must be PDF files.' }

  const testingDateRaw = str(formData, 'testingDate')
  const testingDate = testingDateRaw ? new Date(testingDateRaw) : null
  if (testingDate && Number.isNaN(testingDate.getTime())) return { error: 'Invalid testing date.' }
  const laboratory = str(formData, 'laboratory', 200) || null
  const coaNumber = str(formData, 'coaNumber', 100) || null
  const lotNumber = str(formData, 'lotNumber', 100)
  const makeCurrent = formData.get('makeCurrent') === 'on'

  const purityVerified = formData.get('purityVerified') === 'on'
  const purityPercentRaw = str(formData, 'purityPercent', 10)
  let purityPercent: number | null = null
  if (purityPercentRaw !== '') {
    const n = Number(purityPercentRaw)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: 'Purity percent must be a number between 0 and 100.' }
    }
    purityPercent = n
  }
  if (purityVerified && purityPercent === null) {
    return { error: 'Enter the purity percent documented in this COA to mark it verified.' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // Basic content check: PDF magic bytes
  if (buffer.subarray(0, 5).toString() !== '%PDF-') {
    return { error: 'The uploaded file is not a valid PDF.' }
  }
  const storageKey = await storeFile(`coas/${product.sku.toLowerCase()}`, '.pdf', buffer)

  await prisma.$transaction(async (tx) => {
    let lotId: string | null = null
    if (lotNumber) {
      const lot = await tx.lot.upsert({
        where: { productId_lotNumber: { productId, lotNumber } },
        create: { productId, lotNumber, isCurrent: makeCurrent },
        update: makeCurrent ? { isCurrent: true } : {},
      })
      lotId = lot.id
      if (makeCurrent) {
        await tx.lot.updateMany({
          where: { productId, id: { not: lot.id } },
          data: { isCurrent: false },
        })
      }
    }
    if (makeCurrent) {
      // Previous current COA becomes historical — never destroyed.
      await tx.coa.updateMany({ where: { productId }, data: { isCurrent: false } })
    }
    await tx.coa.create({
      data: {
        productId,
        lotId,
        storageKey,
        originalFilename: file.name.slice(0, 255),
        mimeType: 'application/pdf',
        fileSizeBytes: file.size,
        testingDate,
        laboratory,
        coaNumber,
        isCurrent: makeCurrent,
        active: true,
        purityVerified,
        purityPercent,
        uploadedById: admin.id,
      },
    })
  })

  await audit({
    userId: admin.id,
    action: 'COA_UPLOADED',
    objectType: 'Coa',
    objectId: productId,
    after: { product: product.sku, laboratory, coaNumber, lotNumber, makeCurrent, purityVerified, purityPercent },
  })
  revalidatePath('/admin/coas')
  revalidatePath('/coas')
  revalidatePath(`/products/${product.slug}`)
  return { success: `COA uploaded for ${product.name} — ${product.vialSize}.` }
}

export async function setCoaStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')
  const op = str(formData, 'op') // make-current | deactivate | reactivate
  const coa = await prisma.coa.findUnique({ where: { id }, include: { product: true } })
  if (!coa) return

  if (op === 'make-current') {
    await prisma.$transaction([
      prisma.coa.updateMany({ where: { productId: coa.productId }, data: { isCurrent: false } }),
      prisma.coa.update({ where: { id }, data: { isCurrent: true, active: true } }),
    ])
    await audit({ userId: admin.id, action: 'COA_SET_CURRENT', objectType: 'Coa', objectId: id })
  } else if (op === 'deactivate') {
    await prisma.coa.update({ where: { id }, data: { active: false, isCurrent: false } })
    await audit({ userId: admin.id, action: 'COA_DEACTIVATED', objectType: 'Coa', objectId: id })
  } else if (op === 'reactivate') {
    await prisma.coa.update({ where: { id }, data: { active: true } })
    await audit({ userId: admin.id, action: 'COA_REACTIVATED', objectType: 'Coa', objectId: id })
  }
  revalidatePath('/admin/coas')
  revalidatePath('/coas')
  revalidatePath(`/products/${coa.product.slug}`)
}

/**
 * Flip the "Verified Purity" claim on an existing COA — the mechanism for
 * turning it on the moment lab testing completes, without re-uploading the
 * document. The claim must always be backed by a percent figure actually
 * documented in the COA; it is never inferred from the file's presence.
 */
export async function updateCoaVerificationAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = str(formData, 'id')
  const coa = await prisma.coa.findUnique({ where: { id }, include: { product: true } })
  if (!coa) return { error: 'COA not found.' }

  const purityVerified = formData.get('purityVerified') === 'on'
  const purityPercentRaw = str(formData, 'purityPercent', 10)
  let purityPercent: number | null = null
  if (purityPercentRaw !== '') {
    const n = Number(purityPercentRaw)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: 'Purity percent must be a number between 0 and 100.' }
    }
    purityPercent = n
  }
  if (purityVerified && purityPercent === null) {
    return { error: 'Enter the purity percent documented in this COA to mark it verified.' }
  }

  await prisma.coa.update({ where: { id }, data: { purityVerified, purityPercent } })
  await audit({
    userId: admin.id,
    action: 'COA_VERIFICATION_UPDATED',
    objectType: 'Coa',
    objectId: id,
    before: { purityVerified: coa.purityVerified, purityPercent: coa.purityPercent },
    after: { purityVerified, purityPercent },
  })
  revalidatePath('/admin/coas')
  revalidatePath('/coas')
  revalidatePath(`/products/${coa.product.slug}`)
  return { success: purityVerified ? 'Marked as verified purity.' : 'Verification claim cleared.' }
}

// ---------------------------------------------------------------------------
// Customers / admin users
// ---------------------------------------------------------------------------

export async function setCustomerDisabledAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const userId = str(formData, 'userId')
  const disabled = str(formData, 'disabled') === 'true'
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return
  if (target.role === 'SUPER_ADMIN') return // never lock out the super admin this way
  await prisma.user.update({ where: { id: userId }, data: { disabled } })
  if (disabled) await prisma.session.deleteMany({ where: { userId } })
  await audit({
    userId: admin.id,
    action: disabled ? 'CUSTOMER_DISABLED' : 'CUSTOMER_ENABLED',
    objectType: 'User',
    objectId: userId,
  })
  revalidatePath('/admin/customers')
}

export async function setUserRoleAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin('SUPER_ADMIN')
  const email = str(formData, 'email', 254).toLowerCase()
  const role = str(formData, 'role', 20)
  if (!['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return { error: 'Invalid role.' }
  const target = await prisma.user.findUnique({ where: { email } })
  if (!target) return { error: 'No account with that email.' }
  if (target.id === admin.id && role !== 'SUPER_ADMIN') {
    return { error: 'You cannot demote your own account.' }
  }
  await prisma.user.update({ where: { id: target.id }, data: { role } })
  await audit({
    userId: admin.id,
    action: 'USER_ROLE_CHANGED',
    objectType: 'User',
    objectId: target.id,
    before: { role: target.role },
    after: { role },
  })
  revalidatePath('/admin/users')
  return { success: `${email} is now ${role}.` }
}
