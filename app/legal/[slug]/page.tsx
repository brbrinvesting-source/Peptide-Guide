import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'

const KNOWN_SLUGS = ['terms', 'privacy', 'research-disclaimer', 'shipping-policy', 'refund-policy']

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await prisma.contentPage.findUnique({ where: { slug } })
  return { title: page?.title ?? 'Legal', description: `${page?.title ?? 'Legal'} — All-Access Peptides.` }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!KNOWN_SLUGS.includes(slug)) notFound()
  const page = await prisma.contentPage.findUnique({ where: { slug } })
  if (!page) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="microlabel text-gold">All-Access Peptides</p>
      <h1 className="gold-keyline mt-2 text-3xl font-bold tracking-tight">{page.title}</h1>
      <p className="mt-6 text-xs text-muted">
        Version {page.version} · Last updated {page.updatedAt.toLocaleDateString('en-US')}
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed whitespace-pre-line text-fg/90">
        {page.body}
      </div>
    </div>
  )
}
