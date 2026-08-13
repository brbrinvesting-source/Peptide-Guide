import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Initial catalog. Per business requirements: NO prices and NO inventory are
// assigned here — both are entered later through the admin dashboard.

const CATEGORIES = [
  { name: 'Retatrutide', slug: 'retatrutide' },
  { name: 'Tirzepatide', slug: 'tirzepatide' },
  { name: 'Recovery / Research', slug: 'recovery-research' },
  { name: 'Blends', slug: 'blends' },
  { name: 'GH / Secretagogue Research', slug: 'gh-secretagogue-research' },
  { name: 'Copper / Cosmetic Research', slug: 'copper-cosmetic-research' },
  { name: 'Cellular / Metabolic Research', slug: 'cellular-metabolic-research' },
]

interface SeedProduct {
  name: string
  vialSize: string
  category: string
  sku: string
}

const PRODUCTS: SeedProduct[] = [
  // Retatrutide
  { name: 'Reta GLP3', vialSize: '10 mg', category: 'retatrutide', sku: 'RETA-10' },
  { name: 'Reta GLP3', vialSize: '20 mg', category: 'retatrutide', sku: 'RETA-20' },
  { name: 'Reta GLP3', vialSize: '30 mg', category: 'retatrutide', sku: 'RETA-30' },
  // Tirzepatide
  { name: 'Tirzep GLP2', vialSize: '10 mg', category: 'tirzepatide', sku: 'TIRZ-10' },
  { name: 'Tirzep GLP2', vialSize: '15 mg', category: 'tirzepatide', sku: 'TIRZ-15' },
  { name: 'Tirzep GLP2', vialSize: '20 mg', category: 'tirzepatide', sku: 'TIRZ-20' },
  { name: 'Tirzep GLP2', vialSize: '30 mg', category: 'tirzepatide', sku: 'TIRZ-30' },
  { name: 'Tirzep GLP2', vialSize: '40 mg', category: 'tirzepatide', sku: 'TIRZ-40' },
  { name: 'Tirzep GLP2', vialSize: '60 mg', category: 'tirzepatide', sku: 'TIRZ-60' },
  // Recovery / Research
  { name: 'BPC-157', vialSize: '10 mg', category: 'recovery-research', sku: 'BPC-10' },
  { name: 'TB-500', vialSize: '10 mg', category: 'recovery-research', sku: 'TB500-10' },
  { name: 'BPC157/TB500 (Wolverine)', vialSize: '20 mg', category: 'recovery-research', sku: 'WOLV-20' },
  // Blends
  { name: 'Glow', vialSize: '70 mg', category: 'blends', sku: 'GLOW-70' },
  { name: 'Klow', vialSize: '80 mg', category: 'blends', sku: 'KLOW-80' },
  // GH / Secretagogue Research
  { name: 'AOD 9604', vialSize: '5 mg', category: 'gh-secretagogue-research', sku: 'AOD-5' },
  { name: 'AOD 9604', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'AOD-10' },
  { name: 'CJC-1295 (DAC)', vialSize: '5 mg', category: 'gh-secretagogue-research', sku: 'CJC-DAC-5' },
  { name: 'CJC-1295 (No DAC)', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'CJC-NODAC-10' },
  { name: 'CJC-1285 (No DAC)/Ipamorelin', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'CJC-IPA-10' },
  { name: 'Ipamorelin', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'IPA-10' },
  { name: 'Sermorelin', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'SERM-10' },
  { name: 'Tesamorelin', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'TESA-10' },
  { name: 'Tesamorelin', vialSize: '20 mg', category: 'gh-secretagogue-research', sku: 'TESA-20' },
  { name: 'IGF-1 LR3', vialSize: '1 mg', category: 'gh-secretagogue-research', sku: 'IGF1-1' },
  // Copper / Cosmetic Research
  { name: 'GHK-Cu', vialSize: '50 mg', category: 'copper-cosmetic-research', sku: 'GHKCU-50' },
  { name: 'GHK-Cu', vialSize: '100 mg', category: 'copper-cosmetic-research', sku: 'GHKCU-100' },
  // Cellular / Metabolic Research
  { name: 'MOTS-C', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: 'MOTSC-10' },
  { name: 'MOTS-C', vialSize: '40 mg', category: 'cellular-metabolic-research', sku: 'MOTSC-40' },
  { name: 'MT-2', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: 'MT2-10' },
  { name: 'NAD+', vialSize: '500 mg', category: 'cellular-metabolic-research', sku: 'NAD-500' },
  { name: 'NAD+', vialSize: '1000 mg', category: 'cellular-metabolic-research', sku: 'NAD-1000' },
  { name: 'KPV', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: 'KPV-10' },
  { name: 'Selank', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: 'SELANK-10' },
  { name: 'Semax', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: 'SEMAX-10' },
  { name: 'SS-31', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: 'SS31-10' },
  { name: 'SS-31', vialSize: '50 mg', category: 'cellular-metabolic-research', sku: 'SS31-50' },
  { name: 'L-Carnitine', vialSize: '600 mg', category: 'cellular-metabolic-research', sku: 'LCAR-600' },
  { name: '5-Amino 1MQ', vialSize: '10 mg', category: 'cellular-metabolic-research', sku: '5AMQ-10' },
  { name: '5-Amino 1MQ', vialSize: '50 mg', category: 'cellular-metabolic-research', sku: '5AMQ-50' },
  { name: 'Epithalon', vialSize: '50 mg', category: 'cellular-metabolic-research', sku: 'EPI-50' },
  { name: 'Glutathione', vialSize: '1500 mg', category: 'cellular-metabolic-research', sku: 'GLUT-1500' },
  { name: 'HCG', vialSize: '10,000 IU', category: 'cellular-metabolic-research', sku: 'HCG-10K' },
]

// Discontinued — no longer sold. Kept here only so the seed can find and
// remove any copy left over in a previously-seeded database.
const DISCONTINUED_SKUS = ['BACWATER-10']
const DISCONTINUED_CATEGORY_SLUGS = ['supplies']

function slugify(name: string, vialSize: string): string {
  return `${name} ${vialSize}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const CONTENT_PAGES = [
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    body: `PLACEHOLDER — final legal language to be supplied by counsel.\n\nThese Terms & Conditions govern use of the All-Access Peptides website and the purchase of products offered through it.\n\n1. Research Use Only. All products sold through this website are intended strictly for laboratory research purposes only and are not for human or veterinary consumption of any kind.\n\n2. Eligibility. You must be at least 18 years of age and must maintain an account in good standing to purchase.\n\n3. Orders. All orders are subject to acceptance and product availability. We reserve the right to refuse or cancel any order.\n\n4. Pricing. Prices, promotions, and availability are subject to change without notice.\n\n5. Limitation of Liability. To the maximum extent permitted by law, All-Access Peptides disclaims all warranties, express or implied, regarding products supplied for research use.\n\nContact us with any questions about these terms.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    body: `PLACEHOLDER — final legal language to be supplied by counsel.\n\nThis Privacy Policy explains how All-Access Peptides collects, uses, and protects your information.\n\nInformation We Collect: account information (email, name), order and shipping information, and website usage information.\n\nHow We Use It: to operate your account, process orders, provide customer support, send transactional email, and (with your consent) send marketing communications.\n\nPayment Data: payments are processed by our payment provider. We never store your full card number on our servers.\n\nYour Choices: you can opt out of marketing communications at any time from your account page.\n\nContact us for privacy requests.`,
  },
  {
    slug: 'research-disclaimer',
    title: 'Research Use Disclaimer',
    body: `All products offered by All-Access Peptides are supplied strictly FOR RESEARCH USE ONLY.\n\nProducts are NOT for human or veterinary consumption of any kind, including but not limited to ingestion, injection, topical application, or any other route of administration.\n\nProducts sold by All-Access Peptides are not medications, are not dietary supplements, and are not FDA-approved for the treatment, cure, mitigation, prevention, or diagnosis of any disease or condition. No statement on this website should be interpreted as a medical, therapeutic, or efficacy claim of any kind.\n\nAll-Access Peptides does not provide, and this website does not contain, any dosing, titration, reconstitution, or administration protocols or guidance of any kind. Customers seeking such information should look elsewhere; providing it is outside the scope of a research supplier.\n\nEvery account holder is required to affirmatively certify, at registration, that they are a qualified researcher or are creating the account on behalf of a research institution or organization. By purchasing, the customer additionally represents that products will be handled by individuals trained in safe laboratory practices.\n\nEvery order also requires a separate affirmative acknowledgement of this disclaimer before payment can be submitted.`,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    body: `PLACEHOLDER — update with final carrier and handling details.\n\nAll-Access Peptides ships to all 50 U.S. states. We do not offer international shipping.\n\nOrders are typically processed within 1–2 business days. Delivery estimates shown at checkout depend on the shipping method selected and are estimates, not guarantees.\n\nOrders over the free-shipping threshold displayed in your cart qualify for free shipping.\n\nA shipping confirmation email with tracking information is sent when your order ships.`,
  },
  {
    slug: 'refund-policy',
    title: 'Refund & Return Policy',
    body: `PLACEHOLDER — update with final policy language.\n\nBecause of the nature of research materials, all sales are generally final once an order has shipped.\n\nIf your order arrives damaged, incorrect, or incomplete, contact us within 7 days of delivery and we will make it right with a replacement or refund where appropriate.\n\nRefunds, when issued, are returned to the original payment method. Please allow 5–10 business days for the refund to appear.`,
  },
]

async function main() {
  console.log('Seeding categories...')
  const categoryMap = new Map<string, string>()
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i]
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, sortOrder: i },
      update: { name: c.name, sortOrder: i },
    })
    categoryMap.set(c.slug, row.id)
  }

  console.log('Seeding products (no prices, no inventory — set via admin)...')
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i]
    const slug = slugify(p.name, p.vialSize)
    await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        name: p.name,
        slug,
        sku: p.sku,
        categoryId: categoryMap.get(p.category)!,
        vialSize: p.vialSize,
        priceCents: null,
        inventoryQty: 0,
        sortOrder: i,
        description: null,
        active: true,
      },
      update: {
        name: p.name,
        slug,
        categoryId: categoryMap.get(p.category)!,
        vialSize: p.vialSize,
        sortOrder: i,
      },
    })
  }

  console.log('Removing discontinued products...')
  for (const sku of DISCONTINUED_SKUS) {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) continue
    const orderItemCount = await prisma.orderItem.count({ where: { productId: product.id } })
    if (orderItemCount > 0) {
      // Never destroy historical order data — hide it instead.
      await prisma.product.update({ where: { id: product.id }, data: { active: false, featured: false } })
      console.log(`  ${sku} has order history — deactivated instead of deleted.`)
      continue
    }
    await prisma.cartItem.deleteMany({ where: { productId: product.id } })
    await prisma.inventoryTransaction.deleteMany({ where: { productId: product.id } })
    await prisma.coa.deleteMany({ where: { productId: product.id } })
    await prisma.lot.deleteMany({ where: { productId: product.id } })
    await prisma.productImage.deleteMany({ where: { productId: product.id } })
    await prisma.product.delete({ where: { id: product.id } })
    console.log(`  ${sku} removed.`)
  }
  for (const slug of DISCONTINUED_CATEGORY_SLUGS) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    })
    if (category && category._count.products === 0) {
      await prisma.category.delete({ where: { id: category.id } })
      console.log(`  Empty category "${slug}" removed.`)
    }
  }

  console.log('Seeding default shipping method...')
  const existingShipping = await prisma.shippingMethod.count()
  if (existingShipping === 0) {
    await prisma.shippingMethod.create({
      data: {
        name: 'Standard Shipping',
        priceCents: 995,
        deliveryEstimate: '2–4 business days',
        active: true,
        freeShippingEligible: true,
        sortOrder: 0,
      },
    })
  }

  console.log('Seeding legal/content pages...')
  for (const page of CONTENT_PAGES) {
    await prisma.contentPage.upsert({
      where: { slug: page.slug },
      create: page,
      update: {}, // never overwrite admin-edited content
    })
  }

  console.log('Seed complete.')
  console.log('Create the first Super Admin with: npm run create-admin')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
