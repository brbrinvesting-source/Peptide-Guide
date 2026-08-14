import 'server-only'
import { formatCents, RESEARCH_DISCLAIMER_SHORT } from '../constants'
import { absoluteUrl } from '../site'

// Brand-consistent transactional email layout: black/white, subtle gold
// accents, single clear CTA, mobile-friendly single column.

const GOLD = '#c9a961'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function layout(opts: {
  title: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
}): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px"><tr><td style="background:${GOLD};border-radius:4px">
           <a href="${opts.ctaUrl}" style="display:inline-block;padding:14px 32px;color:#0a0a0a;font-weight:700;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;font-size:13px">${escapeHtml(opts.ctaLabel)}</a>
         </td></tr></table>`
      : ''
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111111;border:1px solid rgba(255,255,255,0.14);border-radius:8px">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.1);text-align:center">
          <img src="${absoluteUrl('/brand/aa-logo.png')}" width="150" height="100" alt="All-Access Peptides" style="display:inline-block;border:0" />
        </td></tr>
        <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#e5e5e5;font-size:15px;line-height:1.6">
          <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff;letter-spacing:0.02em">${escapeHtml(opts.title)}</h1>
          ${opts.bodyHtml}
          ${cta}
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.1);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a8a8a;line-height:1.6;text-align:center">
          ${escapeHtml(RESEARCH_DISCLAIMER_SHORT)}<br/>
          &copy; ${new Date().getFullYear()} All-Access Peptides
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function verificationEmail(url: string) {
  return {
    subject: 'Verify your email — All-Access Peptides',
    html: layout({
      title: 'Verify your email address',
      bodyHtml: `<p>Thanks for creating an account with All-Access Peptides. Confirm your email address to activate your account and access the research catalog.</p>
        <p style="font-size:12px;color:#8a8a8a">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`,
      ctaLabel: 'Verify Email',
      ctaUrl: url,
    }),
    text: `Verify your email to activate your All-Access Peptides account:\n\n${url}\n\nThis link expires in 24 hours.\n\n${RESEARCH_DISCLAIMER_SHORT}`,
  }
}

export function welcomeEmail(opts: { code: string; percent: number; catalogUrl: string }) {
  return {
    subject: `Welcome to All-Access Peptides — ${opts.percent}% off your first order`,
    html: layout({
      title: 'Welcome to All-Access Peptides',
      bodyHtml: `<p>Your account is verified. You now have full access to our research catalog and Certificate of Analysis (COA) library.</p>
        <p>All products supplied by All-Access Peptides are intended strictly for research use only and are not for human or veterinary consumption.</p>
        <div style="margin:24px 0;padding:20px;border:1px dashed ${GOLD};border-radius:6px;text-align:center">
          <div style="font-size:12px;letter-spacing:0.2em;color:#8a8a8a">FIRST ORDER — ${opts.percent}% OFF</div>
          <div style="font-size:24px;letter-spacing:0.14em;color:${GOLD};font-weight:700;margin-top:8px">${escapeHtml(opts.code)}</div>
          <div style="font-size:11px;color:#8a8a8a;margin-top:8px">One-time use. Linked to your account.</div>
        </div>`,
      ctaLabel: 'Browse the Catalog',
      ctaUrl: opts.catalogUrl,
    }),
    text: `Welcome to All-Access Peptides.\n\nYour first-order code (${opts.percent}% off, one-time use, linked to your account): ${opts.code}\n\nBrowse the catalog: ${opts.catalogUrl}\n\n${RESEARCH_DISCLAIMER_SHORT}`,
  }
}

export function passwordResetEmail(url: string) {
  return {
    subject: 'Reset your password — All-Access Peptides',
    html: layout({
      title: 'Reset your password',
      bodyHtml: `<p>We received a request to reset the password on your account. If this was you, use the button below. The link expires in 60 minutes.</p>
        <p style="font-size:12px;color:#8a8a8a">If you didn't request this, you can safely ignore this email — your password will not change.</p>`,
      ctaLabel: 'Reset Password',
      ctaUrl: url,
    }),
    text: `Reset your All-Access Peptides password:\n\n${url}\n\nThe link expires in 60 minutes. If you didn't request this, ignore this email.`,
  }
}

export interface OrderEmailLine {
  name: string
  vialSize: string
  quantity: number
  lineTotalCents: number
}

export function orderLinesTable(lines: OrderEmailLine[]): string {
  const rows = lines
    .map(
      (l) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#e5e5e5">${escapeHtml(l.name)} <span style="color:#8a8a8a">— ${escapeHtml(l.vialSize)}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#8a8a8a;text-align:center">×${l.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#e5e5e5;text-align:right">${formatCents(l.lineTotalCents)}</td>
      </tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}</table>`
}

export function orderConfirmationEmail(opts: {
  orderNumber: string
  lines: OrderEmailLine[]
  subtotalCents: number
  bulkDiscountCents: number
  promoDiscountCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
  orderUrl: string
}) {
  const totals = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
      <tr><td style="padding:4px 0;color:#8a8a8a">Subtotal</td><td style="text-align:right;color:#e5e5e5">${formatCents(opts.subtotalCents)}</td></tr>
      ${opts.bulkDiscountCents > 0 ? `<tr><td style="padding:4px 0;color:#8a8a8a">Bulk discount</td><td style="text-align:right;color:${GOLD}">−${formatCents(opts.bulkDiscountCents)}</td></tr>` : ''}
      ${opts.promoDiscountCents > 0 ? `<tr><td style="padding:4px 0;color:#8a8a8a">Promo discount</td><td style="text-align:right;color:${GOLD}">−${formatCents(opts.promoDiscountCents)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#8a8a8a">Shipping</td><td style="text-align:right;color:#e5e5e5">${opts.shippingCents === 0 ? 'FREE' : formatCents(opts.shippingCents)}</td></tr>
      <tr><td style="padding:4px 0;color:#8a8a8a">Tax</td><td style="text-align:right;color:#e5e5e5">${formatCents(opts.taxCents)}</td></tr>
      <tr><td style="padding:10px 0;color:#ffffff;font-weight:700;border-top:1px solid rgba(255,255,255,0.14)">Total</td><td style="text-align:right;color:#ffffff;font-weight:700;border-top:1px solid rgba(255,255,255,0.14);padding:10px 0">${formatCents(opts.totalCents)}</td></tr>
    </table>`
  return {
    subject: `Order confirmed — ${opts.orderNumber}`,
    html: layout({
      title: `Order ${opts.orderNumber} confirmed`,
      bodyHtml: `<p>Your payment was received and your order is confirmed. A shipping notification will follow once your order is on its way.</p>
        ${orderLinesTable(opts.lines)}${totals}`,
      ctaLabel: 'View Order',
      ctaUrl: opts.orderUrl,
    }),
    text: `Order ${opts.orderNumber} confirmed.\n\n${opts.lines.map((l) => `${l.name} — ${l.vialSize} ×${l.quantity} = ${formatCents(l.lineTotalCents)}`).join('\n')}\n\nTotal: ${formatCents(opts.totalCents)}\n\nView order: ${opts.orderUrl}\n\n${RESEARCH_DISCLAIMER_SHORT}`,
  }
}

export function shippingNotificationEmail(opts: {
  orderNumber: string
  trackingNumber?: string | null
  trackingCarrier?: string | null
  orderUrl: string
}) {
  const tracking = opts.trackingNumber
    ? `<p>Tracking${opts.trackingCarrier ? ` (${escapeHtml(opts.trackingCarrier)})` : ''}: <strong style="color:${GOLD}">${escapeHtml(opts.trackingNumber)}</strong></p>`
    : ''
  return {
    subject: `Your order has shipped — ${opts.orderNumber}`,
    html: layout({
      title: `Order ${opts.orderNumber} has shipped`,
      bodyHtml: `<p>Your order is on its way.</p>${tracking}`,
      ctaLabel: 'View Order',
      ctaUrl: opts.orderUrl,
    }),
    text: `Order ${opts.orderNumber} has shipped.${opts.trackingNumber ? ` Tracking: ${opts.trackingNumber}` : ''}\n\nView order: ${opts.orderUrl}`,
  }
}

export function orderStatusEmail(opts: { orderNumber: string; status: string; orderUrl: string }) {
  return {
    subject: `Order update — ${opts.orderNumber}`,
    html: layout({
      title: `Order ${opts.orderNumber} update`,
      bodyHtml: `<p>Your order status is now: <strong style="color:${GOLD}">${escapeHtml(opts.status)}</strong></p>`,
      ctaLabel: 'View Order',
      ctaUrl: opts.orderUrl,
    }),
    text: `Order ${opts.orderNumber} status: ${opts.status}\n\nView order: ${opts.orderUrl}`,
  }
}

export function abandonedCartEmail(opts: {
  subject: string
  lines: OrderEmailLine[]
  subtotalCents: number
  cartUrl: string
}) {
  return {
    subject: opts.subject,
    html: layout({
      title: 'You left something behind',
      bodyHtml: `<p>The items below are still in your cart. Availability is not reserved, so if your research schedule depends on them, complete your order while they're in stock.</p>
        ${orderLinesTable(opts.lines)}
        <p style="text-align:right;color:#ffffff;font-weight:700">Cart subtotal: ${formatCents(opts.subtotalCents)}</p>`,
      ctaLabel: 'Return to Your Cart',
      ctaUrl: opts.cartUrl,
    }),
    text: `You left items in your All-Access Peptides cart:\n\n${opts.lines.map((l) => `${l.name} — ${l.vialSize} ×${l.quantity}`).join('\n')}\n\nSubtotal: ${formatCents(opts.subtotalCents)}\n\nReturn to your cart: ${opts.cartUrl}\n\n${RESEARCH_DISCLAIMER_SHORT}`,
  }
}

export function adminNotificationEmail(opts: { title: string; bodyText: string; url?: string }) {
  return {
    subject: `[Admin] ${opts.title}`,
    html: layout({
      title: opts.title,
      bodyHtml: `<p style="white-space:pre-line">${escapeHtml(opts.bodyText)}</p>`,
      ctaLabel: opts.url ? 'Open Admin' : undefined,
      ctaUrl: opts.url,
    }),
    text: `${opts.title}\n\n${opts.bodyText}${opts.url ? `\n\n${opts.url}` : ''}`,
  }
}
