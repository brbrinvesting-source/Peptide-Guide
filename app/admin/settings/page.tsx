import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS, getSettings, SETTING_KEYS } from '@/lib/settings'
import { SettingsForms } from './SettingsForms'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const keys = Object.values(SETTING_KEYS) as string[]
  const [settings, shippingMethods, contentPages] = await Promise.all([
    getSettings(keys),
    prisma.shippingMethod.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.contentPage.findMany({ orderBy: { slug: 'asc' } }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Store settings</h1>
      <p className="mt-2 text-xs text-muted">
        Business rules that can change live here — nothing below is hard-coded into the storefront.
      </p>
      <SettingsForms
        settings={settings}
        defaults={DEFAULT_SETTINGS}
        shippingMethods={shippingMethods.map((m) => ({
          id: m.id,
          name: m.name,
          price: (m.priceCents / 100).toFixed(2),
          deliveryEstimate: m.deliveryEstimate ?? '',
          active: m.active,
          freeShippingEligible: m.freeShippingEligible,
          sortOrder: m.sortOrder,
          rateType: m.rateType,
          carrierServiceToken: m.carrierServiceToken ?? '',
        }))}
        contentPages={contentPages.map((p) => ({
          slug: p.slug,
          title: p.title,
          body: p.body,
          version: p.version,
        }))}
      />
    </div>
  )
}
