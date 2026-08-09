import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getBulkTiers, getFreeShippingThresholdCents } from '@/lib/settings'
import { formatCents } from '@/lib/constants'
import { ProductCard, type CatalogProduct } from '@/components/ProductCard'
import { AAMark } from '@/components/Logo'
import { VialImage } from '@/components/VialImage'

export default async function HomePage() {
  const user = await getCurrentUser()
  const authed = Boolean(user?.emailVerified)

  const [featured, threshold, bulkTiers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, featured: true },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        coas: { where: { isCurrent: true, active: true }, select: { id: true }, take: 1 },
      },
      orderBy: { sortOrder: 'asc' },
      take: 4,
    }),
    getFreeShippingThresholdCents(),
    getBulkTiers(),
  ])

  const featuredCards: CatalogProduct[] = featured.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    vialSize: p.vialSize,
    priceCents: p.priceCents,
    inventoryQty: p.inventoryQty,
    lowStockThreshold: p.lowStockThreshold,
    coaComingSoon: p.coaComingSoon,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    hasCurrentCoa: p.coas.length > 0,
    currentCoaId: p.coas[0]?.id ?? null,
  }))

  return (
    <div>
      {/* HERO */}
      <section className="hex-texture relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="microlabel text-gold">For research use only</p>
            <h1 className="mt-4 text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl">
              Research compounds.
              <br />
              <span className="text-gold">Documented.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              A U.S.-based catalog of research-use-only peptides with Certificates of Analysis
              available before you order. Not for human or veterinary consumption.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {authed ? (
                <>
                  <Link href="/catalog" className="btn btn-gold">
                    Browse Catalog
                  </Link>
                  <Link href="/coas" className="btn btn-outline">
                    View COAs
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="btn btn-gold">
                    Create Account
                  </Link>
                  <Link href="/login" className="btn btn-outline">
                    Log In
                  </Link>
                </>
              )}
            </div>
            <ul className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ['COAs', 'Available per product'],
                ['US Only', 'Ships to all 50 states'],
                [`${formatCents(threshold)}+`, 'Free shipping'],
              ].map(([title, sub]) => (
                <li key={title}>
                  <p className="text-sm font-bold tracking-wide text-fg">{title}</p>
                  <p className="mt-1 text-[0.7rem] leading-snug text-muted">{sub}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
            <div className="panel h-full w-full overflow-hidden">
              <VialImage name="All-Access" vialSize="Research Series" />
            </div>
            <div className="absolute -right-3 -bottom-3 flex items-center gap-2 rounded-md border border-gold/50 bg-ink px-4 py-2.5">
              <AAMark size={22} />
              <span className="text-[0.65rem] tracking-[0.24em] text-gold uppercase">
                Catalog access with account
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {featuredCards.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured-heading">
          <div className="mb-8 flex items-end justify-between">
            <div className="gold-keyline">
              <p className="microlabel">Selected compounds</p>
              <h2 id="featured-heading" className="mt-2 text-2xl font-bold tracking-tight">
                Featured Products
              </h2>
            </div>
            <Link
              href="/catalog"
              className="text-xs tracking-[0.18em] text-muted uppercase hover:text-fg"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featuredCards.map((p) => (
              <ProductCard key={p.id} product={p} bulkTiers={bulkTiers} />
            ))}
          </div>
        </section>
      )}

      {/* RESEARCH TRANSPARENCY */}
      <section className="border-y border-line bg-panel" aria-labelledby="transparency-heading">
        <div className="hex-texture mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="microlabel text-gold">Research transparency</p>
          <h2 id="transparency-heading" className="gold-keyline gold-keyline-center mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight">
            Documentation before you order
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted">
            Review Certificates of Analysis and available testing documentation for every listed
            compound in one place — searchable by product, category, and lot.
          </p>
          <Link href="/coas" className="btn btn-gold mt-8">
            View COAs
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how-heading">
        <h2 id="how-heading" className="sr-only">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ['01', 'Create an account', 'Verify your email to unlock the full research catalog.'],
            ['02', 'Review documentation', 'Check COAs and product specifications before ordering.'],
            ['03', 'Order securely', 'Automatic bulk pricing, one promo code per order, tracked shipping.'],
          ].map(([num, title, body]) => (
            <li key={num} className="panel p-6">
              <p className="font-display text-2xl text-gold">{num}</p>
              <h3 className="mt-3 text-sm font-bold tracking-[0.12em] uppercase">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* RESEARCH-USE NOTICE */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <p className="text-xs leading-relaxed font-semibold tracking-[0.16em] text-muted uppercase">
            All products are intended strictly for laboratory research purposes only and are not
            for human or veterinary consumption of any kind.
          </p>
          <Link
            href="/legal/research-disclaimer"
            className="mt-4 inline-block text-xs tracking-[0.14em] text-gold uppercase hover:text-gold-bright"
          >
            Read the full research use disclaimer →
          </Link>
        </div>
      </section>
    </div>
  )
}
