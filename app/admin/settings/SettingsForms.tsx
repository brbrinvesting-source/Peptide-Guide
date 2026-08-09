'use client'

import { useActionState, useState } from 'react'
import {
  saveContentPageAction,
  saveSettingsAction,
  saveShippingMethodAction,
  type AdminActionState,
} from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

const K = {
  STORE_NAME: 'store.name',
  STORE_CONTACT_EMAIL: 'store.contactEmail',
  STORE_CONTACT_INFO: 'store.contactInfo',
  FREE_SHIPPING_THRESHOLD_CENTS: 'shipping.freeThresholdCents',
  BULK_TIERS: 'discounts.bulkTiers',
  WELCOME_DISCOUNT_PERCENT: 'discounts.welcomePercent',
  WELCOME_PROMO_ENABLED: 'discounts.welcomeEnabled',
  LOW_STOCK_DEFAULT_THRESHOLD: 'inventory.lowStockDefault',
  ABANDONED_CART_DELAY_MINUTES: 'email.abandonedCartDelayMinutes',
  ABANDONED_CART_SUBJECT: 'email.abandonedCartSubject',
  EMAIL_SENDER_NAME: 'email.senderName',
  EMAIL_SENDER_ADDRESS: 'email.senderAddress',
  ADMIN_NOTIFICATION_EMAIL: 'email.adminNotificationAddress',
  TAX_PROVIDER: 'tax.provider',
  TAX_FLAT_RATE_BPS: 'tax.flatRateBps',
}

interface ShippingMethodRow {
  id: string
  name: string
  price: string
  deliveryEstimate: string
  active: boolean
  freeShippingEligible: boolean
  sortOrder: number
}

interface ContentPageRow {
  slug: string
  title: string
  body: string
  version: string
}

function SettingsSection({
  title,
  children,
  description,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(saveSettingsAction, {})
  return (
    <section className="panel p-5">
      <p className="microlabel text-gold">{title}</p>
      {description && <p className="mt-1.5 text-xs text-muted">{description}</p>}
      <form action={formAction} className="mt-4 space-y-3">
        {state.error && <Alert kind="error">{state.error}</Alert>}
        {state.success && <Alert kind="success">{state.success}</Alert>}
        {children}
        <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </form>
    </section>
  )
}

function Field({
  label,
  name,
  defaultValue,
  hint,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue: string
  hint?: string
  type?: string
}) {
  return (
    <label className="microlabel block">
      {label}
      <input type={type} name={name} defaultValue={defaultValue} className="field mt-1.5" />
      {hint && <span className="mt-1 block text-[0.65rem] normal-case text-muted">{hint}</span>}
    </label>
  )
}

export function SettingsForms({
  settings,
  defaults,
  shippingMethods,
  contentPages,
}: {
  settings: Record<string, string>
  defaults: Record<string, string>
  shippingMethods: ShippingMethodRow[]
  contentPages: ContentPageRow[]
}) {
  const v = (key: string) => settings[key] ?? defaults[key] ?? ''

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <SettingsSection title="Store">
        <Field label="Business name" name={K.STORE_NAME} defaultValue={v(K.STORE_NAME)} />
        <Field label="Contact email" name={K.STORE_CONTACT_EMAIL} defaultValue={v(K.STORE_CONTACT_EMAIL)} />
        <label className="microlabel block">
          Contact information (footer / contact page)
          <textarea name={K.STORE_CONTACT_INFO} rows={3} defaultValue={v(K.STORE_CONTACT_INFO)} className="field mt-1.5" />
        </label>
      </SettingsSection>

      <SettingsSection
        title="Discounts"
        description="Bulk tiers apply automatically per line item and stack with one promo code."
      >
        <Field
          label="Bulk tiers (JSON)"
          name={K.BULK_TIERS}
          defaultValue={v(K.BULK_TIERS)}
          hint='e.g. [{"minQty":5,"percentOff":5},{"minQty":10,"percentOff":10}]'
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Welcome discount %" name={K.WELCOME_DISCOUNT_PERCENT} defaultValue={v(K.WELCOME_DISCOUNT_PERCENT)} />
          <label className="microlabel block">
            Welcome promo
            <select name={K.WELCOME_PROMO_ENABLED} defaultValue={v(K.WELCOME_PROMO_ENABLED)} className="field mt-1.5">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Shipping threshold"
        description="Orders at or above this merchandise total ship free (eligible methods)."
      >
        <Field
          label="Free-shipping threshold (cents)"
          name={K.FREE_SHIPPING_THRESHOLD_CENTS}
          defaultValue={v(K.FREE_SHIPPING_THRESHOLD_CENTS)}
          hint="25000 = $250.00"
        />
        <Field
          label="Default low-stock threshold"
          name={K.LOW_STOCK_DEFAULT_THRESHOLD}
          defaultValue={v(K.LOW_STOCK_DEFAULT_THRESHOLD)}
        />
      </SettingsSection>

      <SettingsSection
        title="Tax"
        description="Destination-based sales tax. Stripe Tax computes per-address rates; flat mode is for testing only."
      >
        <label className="microlabel block">
          Provider
          <select name={K.TAX_PROVIDER} defaultValue={v(K.TAX_PROVIDER)} className="field mt-1.5">
            <option value="stripe">Stripe Tax (dynamic, recommended)</option>
            <option value="flat">Flat rate (testing)</option>
            <option value="none">No tax</option>
          </select>
        </label>
        <Field
          label="Flat rate (basis points)"
          name={K.TAX_FLAT_RATE_BPS}
          defaultValue={v(K.TAX_FLAT_RATE_BPS)}
          hint="Only used in flat mode. 725 = 7.25%"
        />
      </SettingsSection>

      <SettingsSection title="Email">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sender name" name={K.EMAIL_SENDER_NAME} defaultValue={v(K.EMAIL_SENDER_NAME)} />
          <Field label="Sender address" name={K.EMAIL_SENDER_ADDRESS} defaultValue={v(K.EMAIL_SENDER_ADDRESS)} />
        </div>
        <Field
          label="Admin notification email"
          name={K.ADMIN_NOTIFICATION_EMAIL}
          defaultValue={v(K.ADMIN_NOTIFICATION_EMAIL)}
          hint="New orders, low stock, payment issues. Empty = off."
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Abandoned-cart delay (minutes)"
            name={K.ABANDONED_CART_DELAY_MINUTES}
            defaultValue={v(K.ABANDONED_CART_DELAY_MINUTES)}
          />
          <Field label="Abandoned-cart subject" name={K.ABANDONED_CART_SUBJECT} defaultValue={v(K.ABANDONED_CART_SUBJECT)} />
        </div>
      </SettingsSection>

      <section className="panel p-5">
        <p className="microlabel text-gold">Shipping methods</p>
        <div className="mt-4 space-y-4">
          {shippingMethods.map((m) => (
            <ShippingMethodForm key={m.id} method={m} />
          ))}
          <details>
            <summary className="cursor-pointer text-xs tracking-wide text-gold uppercase">+ Add shipping method</summary>
            <div className="pt-3">
              <ShippingMethodForm method={null} />
            </div>
          </details>
        </div>
      </section>

      <section className="panel p-5 lg:col-span-2">
        <p className="microlabel text-gold">Legal &amp; informational pages</p>
        <p className="mt-1.5 text-xs text-muted">
          Editing the Research Use Disclaimer bumps the version recorded with each checkout
          acknowledgement — update the version field when the language changes.
        </p>
        <div className="mt-4 space-y-3">
          {contentPages.map((p) => (
            <ContentPageForm key={p.slug} page={p} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ShippingMethodForm({ method }: { method: ShippingMethodRow | null }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(saveShippingMethodAction, {})
  return (
    <form action={formAction} className="space-y-2.5 rounded-md border border-line/60 p-3">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      {method && <input type="hidden" name="id" value={method.id} />}
      <div className="grid grid-cols-2 gap-2.5">
        <input name="name" required defaultValue={method?.name} placeholder="Method name" aria-label="Method name" className="field" />
        <input name="price" required inputMode="decimal" defaultValue={method?.price} placeholder="Price USD" aria-label="Price" className="field" />
        <input name="deliveryEstimate" defaultValue={method?.deliveryEstimate} placeholder="Delivery estimate (e.g. 2–4 business days)" aria-label="Delivery estimate" className="field col-span-2" />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="active" defaultChecked={method?.active ?? true} className="h-3.5 w-3.5 accent-[#c9a961]" /> Active</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="freeShippingEligible" defaultChecked={method?.freeShippingEligible ?? true} className="h-3.5 w-3.5 accent-[#c9a961]" /> Free above threshold</label>
        <input name="sortOrder" inputMode="numeric" defaultValue={method?.sortOrder ?? 0} aria-label="Sort order" className="field w-16 py-1.5" />
        <SubmitButton className="btn btn-outline btn-sm" pendingLabel="…">
          {method ? 'Save' : 'Add'}
        </SubmitButton>
      </div>
    </form>
  )
}

function ContentPageForm({ page }: { page: ContentPageRow }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(saveContentPageAction, {})
  const [open, setOpen] = useState(false)
  return (
    <details className="rounded-md border border-line/60" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        {page.title} <span className="text-xs font-normal text-muted">/legal/{page.slug} · v{page.version}</span>
      </summary>
      {open && (
        <form action={formAction} className="space-y-3 border-t border-line/60 p-4">
          {state.error && <Alert kind="error">{state.error}</Alert>}
          {state.success && <Alert kind="success">{state.success}</Alert>}
          <input type="hidden" name="slug" value={page.slug} />
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <input name="title" required defaultValue={page.title} aria-label="Page title" className="field" />
            <input name="version" defaultValue={page.version} aria-label="Version" className="field" />
          </div>
          <textarea name="body" rows={12} required defaultValue={page.body} aria-label="Page body" className="field font-mono text-xs" />
          <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Saving…">
            Save Page
          </SubmitButton>
        </form>
      )}
    </details>
  )
}
