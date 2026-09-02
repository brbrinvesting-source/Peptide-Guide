import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Initial catalog. Per business requirements: NO prices and NO inventory are
// assigned here — both are entered later through the admin dashboard.

const CATEGORIES = [
  { name: 'Weight Loss Research', slug: 'weight-loss-research' },
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
  // Weight Loss Research — AA-R3 (retatrutide) and AA-T2 (tirzepatide)
  // share one category rather than naming the compounds directly.
  { name: 'AA-R3', vialSize: '10 mg', category: 'weight-loss-research', sku: 'AAR3-10' },
  { name: 'AA-R3', vialSize: '20 mg', category: 'weight-loss-research', sku: 'AAR3-20' },
  { name: 'AA-R3', vialSize: '30 mg', category: 'weight-loss-research', sku: 'AAR3-30' },
  { name: 'AA-T2', vialSize: '10 mg', category: 'weight-loss-research', sku: 'AAT2-10' },
  { name: 'AA-T2', vialSize: '15 mg', category: 'weight-loss-research', sku: 'AAT2-15' },
  { name: 'AA-T2', vialSize: '20 mg', category: 'weight-loss-research', sku: 'AAT2-20' },
  { name: 'AA-T2', vialSize: '30 mg', category: 'weight-loss-research', sku: 'AAT2-30' },
  { name: 'AA-T2', vialSize: '40 mg', category: 'weight-loss-research', sku: 'AAT2-40' },
  { name: 'AA-T2', vialSize: '60 mg', category: 'weight-loss-research', sku: 'AAT2-60' },
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
  { name: 'CJC-1295 (No DAC)/Ipamorelin', vialSize: '10 mg', category: 'gh-secretagogue-research', sku: 'CJC-IPA-10' },
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

// Categories merged into another category above (their products now list
// the merged slug directly, so the upsert loop reassigns them automatically
// on every run). Kept here only so the seed can remove the old, now-empty
// category rows left over in a previously-seeded database.
const MERGED_CATEGORY_SLUGS = ['retatrutide', 'tirzepatide']

// Renamed products. Kept here only so the seed can migrate any copy left
// over in a previously-seeded database — updated IN PLACE (same row, same
// id) so admin-entered price/inventory/images/COAs/orders stay attached to
// the product rather than being lost to a delete-and-recreate.
const RENAMES: { fromSku: string; toSku: string; toName: string }[] = [
  { fromSku: 'RETA-10', toSku: 'AAR3-10', toName: 'AA-R3' },
  { fromSku: 'RETA-20', toSku: 'AAR3-20', toName: 'AA-R3' },
  { fromSku: 'RETA-30', toSku: 'AAR3-30', toName: 'AA-R3' },
  { fromSku: 'TIRZ-10', toSku: 'AAT2-10', toName: 'AA-T2' },
  { fromSku: 'TIRZ-15', toSku: 'AAT2-15', toName: 'AA-T2' },
  { fromSku: 'TIRZ-20', toSku: 'AAT2-20', toName: 'AA-T2' },
  { fromSku: 'TIRZ-30', toSku: 'AAT2-30', toName: 'AA-T2' },
  { fromSku: 'TIRZ-40', toSku: 'AAT2-40', toName: 'AA-T2' },
  { fromSku: 'TIRZ-60', toSku: 'AAT2-60', toName: 'AA-T2' },
]

// Products whose printed QR-code labels already point at the current slug
// (see /verify/[slug]) — fixing a display-name typo here must never change
// the slug those physical labels resolve to, or a scanned QR code 404s.
// Keyed by SKU; value is the slug to keep pinned regardless of name.
const SLUG_OVERRIDES: Record<string, string> = {
  'CJC-IPA-10': 'cjc-1285-no-dac-ipamorelin-10-mg', // name fixed 1285->1295; slug intentionally left as-is
}

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
    body: `PLACEHOLDER — final legal language to be supplied by counsel.\n\nThese Terms & Conditions govern use of the All-Access Peptides website and the purchase of products offered through it.\n\n1. Research Use Only. All products sold through this website are intended strictly for laboratory research purposes only and are not for human or veterinary consumption of any kind.\n\n2. Eligibility. You must be at least 21 years of age, a qualified researcher or purchasing on behalf of a research institution or organization, and must maintain an account in good standing to purchase.\n\n3. Orders. All orders are subject to acceptance and product availability. We reserve the right to refuse or cancel any order.\n\n4. Pricing. Prices, promotions, and availability are subject to change without notice.\n\n5. Limitation of Liability. To the maximum extent permitted by law, All-Access Peptides disclaims all warranties, express or implied, regarding products supplied for research use.\n\nContact us with any questions about these terms.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    body: `Effective Date: August 20, 2026\n\nIntroduction\n\nThis Privacy Policy describes how All-Access Peptides ("Company," "we," "us," or "our") collects, uses, and safeguards your personal information when you visit our website or purchase products. Our platform sells research peptides for laboratory research use only and is intended for use by U.S. residents age 21 and older. Users under the age of 21 are strictly prohibited from using the platform, and the site is not intended for children.\n\nWe only ship products within the continental United States. By using our website, you acknowledge that you have read and agree to this Privacy Policy. If you do not agree with our practices, please do not use the site. For any questions or concerns about this Policy or our data practices, please contact us using the information provided in the Contact Information section below.\n\nInformation We Collect\n\nWe collect several types of personal information in order to provide and improve our services. This includes information you provide directly to us (for example, when placing an order or creating an account) and information collected automatically when you use our site. We do not collect any sensitive health or medical data about you.\n\nPersonal Identifiers: When you make a purchase or register on our site, we collect personal details such as your full name, email address, telephone number, and postal address (including billing and shipping address). We require this information to process your orders, deliver products, and communicate with you about your purchases. You will also create login credentials (a password) to access your account.\n\nPayment Information: If you make a purchase, you will provide payment details (e.g. credit or debit card information) at checkout. We do not store your full payment card details on our servers. Payment transactions are handled through Stripe, our certified third-party payment processor, and your sensitive payment information is transmitted directly to them for processing.\n\nNo Health Data: We do not collect any health information or medical data about our users. Please do not submit any personal health details to us. Our products are sold for research purposes only, and our site is not designed to collect or handle medical or health-related information.\n\nAutomatically Collected Data: When you interact with our website, we automatically collect basic technical and usage data about your visit, such as your IP address, device and browser type, operating system, pages viewed, and the dates/times of access. We use this information to operate the site securely (for example, detecting fraud or abuse) and to understand overall site usage. We describe our use of cookies in more detail in the Cookies and Similar Technologies section below.\n\nCookies and Similar Technologies\n\nWe use a small number of cookies that are strictly necessary for the website to function. We do not currently use any third-party analytics or advertising tracking cookies.\n\nFunctional Cookies: These cookies are essential for the website's operation. They include a session cookie that keeps you logged into your account, a cookie that remembers you have passed our age and research-use acknowledgement gate, and — if you arrived via a referral link — a cookie that attributes your account to the researcher who referred you. These cookies do not track you across other websites and are not used for advertising.\n\nPayment Processor Cookies: Stripe, our payment processor, may set its own cookies during checkout for fraud prevention and security purposes. These are governed by Stripe's own privacy policy, not this one.\n\nYour Choices Regarding Cookies: You can control or delete cookies through your browser settings at any time. Please note that if you block the functional cookies described above, core features such as staying logged in or completing checkout may not work correctly.\n\nIf we add any analytics, advertising, or other tracking technology to the site in the future, we will update this Policy to describe it before it goes into effect.\n\nThird-Party Services and Data Collection\n\nWe share information with a small number of trusted service providers who help us operate the business. We do not share personal information with third parties for their own independent marketing purposes.\n\nPayment Processing: Stripe handles all payment transactions and tax calculation on our behalf. Stripe receives the payment and billing information necessary to process your order and is subject to its own privacy policy and PCI-DSS security standards.\n\nShipping: We use Shippo to calculate live shipping rates and, where applicable, purchase shipping labels through carriers such as USPS, UPS, and FedEx. Shippo and the carrier receive your shipping name, address, and package information necessary to deliver your order.\n\nEmail Delivery: We use a transactional email provider (such as Postmark) to send account, order, and — where you have not opted out — marketing emails. The provider receives your email address and the content of the email being sent.\n\nHosting and Infrastructure: Our website, database, and file storage are hosted on Netlify's infrastructure. Netlify processes data as necessary to serve the site and store information securely; it does not use your data for its own marketing purposes.\n\nWe may update this list of third-party services from time to time as our business needs change. If we add a significant new third-party integration that affects how your data is collected or used, we will reflect that change in this Privacy Policy.\n\nHow We Use Your Information\n\nWe use the personal information we collect for the following purposes:\n\nOrder Processing and Fulfillment: We use your name, address, phone number, and email to process and fulfill your orders, provide order and shipping confirmations, update you on delivery status, and handle refunds as necessary.\n\nAccount Creation and Maintenance: If you create an account, we use your email and password to set up and maintain it, allowing you to securely log in, view order history, and store your saved addresses.\n\nRewards and Referrals: If you participate in our rewards points or referral program, we track your points balance, referral code, and any account you referred in order to award and redeem points correctly.\n\nCustomer Service and Support: When you contact us with questions or issues, we use your contact information and the content of your message to respond and assist you.\n\nCommunications: We use your contact information to send transactional emails, such as order confirmations, shipping notifications, and account-related messages. These are necessary to fulfill your order and are not promotional; they cannot be opted out of while you have an active account or order.\n\nMarketing Communications: With your consent, we may send you promotional emails, such as abandoned-cart reminders or product announcements. You can opt out of these at any time from your account settings, or by contacting us. Opting out does not affect transactional emails related to your orders or account.\n\nSecurity and Fraud Prevention: We use information such as IP address and order history to detect and prevent fraud, abuse, and unauthorized access to accounts.\n\nLegal Compliance: We use and disclose personal information where required to comply with applicable laws, regulations, legal process, or governmental requests, and to enforce our Terms & Conditions.\n\nWe will only use your personal information for the purposes described above and will not use it in incompatible ways without your consent. We do not sell your personal information to third parties.\n\nSharing and Disclosure of Information\n\nWe do not sell, rent, or trade your personal information to unaffiliated third parties for their own marketing use. We only share your information in the following circumstances:\n\nService Providers: As described in the Third-Party Services section above, we share information with our payment processor, shipping/carrier partners, email delivery provider, and hosting infrastructure, each limited to what they need to perform their function for us.\n\nLegal Requirements and Protection of Rights: We may disclose personal information if required by law or legal process, or if we believe in good faith that disclosure is necessary to comply with a legal obligation, protect the rights or safety of our customers or others, investigate fraud or abuse, or defend against legal claims.\n\nBusiness Transfers: If we are involved in a merger, acquisition, reorganization, or sale of assets, personal information may be transferred as part of that transaction. We will ensure any successor honors the commitments made in this Privacy Policy, or will notify you if that is not the case.\n\nData Retention\n\nWe retain personal information for only as long as necessary to fulfill the purposes for which it was collected, or as required by law.\n\nCustomer and Order Data: We retain your account information for as long as your account remains active, and order records for as long as needed to comply with tax, accounting, and warranty obligations.\n\nMarketing Data: If you opt out of marketing communications, we stop sending them and retain a record of your opt-out so we continue to honor it.\n\nLegal Retention: We retain information as needed to comply with legal obligations, resolve disputes, and enforce our agreements.\n\nWhen we no longer have a legitimate need to retain your information, we will securely delete or anonymize it.\n\nData Security\n\nWe take reasonable, industry-standard measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction, including:\n\nEncryption: Our website is served over HTTPS, encrypting information in transit. Passwords are stored as one-way cryptographic hashes, never in plain text.\n\nAccess Controls: Access to personal data is limited to personnel who need it to perform their role, and administrative access requires authentication.\n\nPayment Security: Payment processing is handled by Stripe, a PCI-DSS compliant provider. We do not store full card numbers or security codes on our own servers.\n\nNo method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security. Please avoid sending sensitive information (such as full card numbers or passwords) to us via email. If we become aware of a security breach affecting your personal information, we will notify you as required by applicable law.\n\nYour Rights and Choices\n\nAccess and Correction: You can review and update most of your personal information directly from your account page, or by contacting us to request a copy or correction of the information we hold about you.\n\nDeletion: You can request that we delete your account and associated personal information by contacting us. We may need to retain certain records (such as order/tax records) as required by law, and will let you know if that applies to your request.\n\nOpt-Out of Marketing: You can opt out of marketing emails at any time from your account settings or by contacting us. This will not affect transactional emails related to your orders or account.\n\nCalifornia Privacy Rights: If you are a California resident, you may have additional rights under the CCPA/CPRA, including the right to request disclosure of the categories of personal information we collect, the right to request deletion, and the right to opt out of the "sale" or "sharing" of personal information (as defined under California law) — though as noted, we do not sell your personal information. Contact us to exercise these rights.\n\nOther State Privacy Rights: If you reside in a state with its own privacy law (such as Virginia or Colorado), you may have similar rights to access or delete your data. Contact us to exercise any rights available under your state's law, and we will verify your identity and respond within the timeframe required by law.\n\nComplaints: If you have concerns about how we handle your personal information, please contact us so we can address them. You may also contact the Federal Trade Commission or your state Attorney General's office.\n\nWe will not discriminate against you for exercising any of these rights.\n\nUsers Under 21 (Age Restriction)\n\nOur platform is intended for adults 21 and older only. We do not knowingly permit anyone under 21 to use our website, register an account, or purchase our products, and we do not intentionally collect personal information from anyone under 21. Registration requires an affirmative age certification, and every visitor must acknowledge our age and research-use gate before browsing the site.\n\nIf we learn that we have inadvertently collected personal information from someone under 21, we will take steps to delete that information and close the associated account. Parents or guardians who believe their minor has provided information to us, or otherwise accessed the site, should contact us immediately.\n\nOur site is not directed at, and does not knowingly collect information from, children under 13, consistent with the Children's Online Privacy Protection Act (COPPA).\n\nEmail Marketing Communications\n\nWith your consent, we may send you promotional emails, such as reminders about items left in your cart or announcements about new products. You can opt out of these emails at any time from your account settings, or by contacting us. Opting out of marketing emails will not affect your receipt of transactional emails about your orders or account, which we send regardless of your marketing preference because they are necessary to fulfill your purchase. We comply with the CAN-SPAM Act: our marketing emails identify the sender, provide a way to unsubscribe, and we will promptly honor all opt-out requests.\n\nInternational Users\n\nOur website and services are intended for customers within the United States. If you access the site from outside the United States, your information will be transferred to and processed in the United States, where our servers and database are located. By using our site, you acknowledge that your information will be handled as described in this Privacy Policy.\n\nChanges to This Privacy Policy\n\nWe may update this Privacy Policy from time to time to reflect changes in our practices, technologies, or legal requirements. If we make material changes, we will post the updated Policy on our website with a new effective date. Your continued use of the site after changes become effective constitutes acceptance of the revised Policy.\n\nContact Information\n\nIf you have any questions, concerns, or requests regarding this Privacy Policy or our handling of your personal information, please contact us:\n\nEmail: support@all-accesspeptides.com\n\nMail: Privacy Officer – All-Access Peptides\n8605 Santa Monica Blvd PMB 515803\nWest Hollywood, California 90069-4109\n\nPlease include your name, contact information, and a detailed description of your request. If you are exercising a specific privacy right (such as access or deletion), please state that clearly. We may need to verify your identity before acting on certain requests.`,
  },
  {
    slug: 'research-disclaimer',
    title: 'Research Use Disclaimer',
    body: `All products offered by All-Access Peptides are supplied strictly FOR RESEARCH USE ONLY.\n\nProducts are NOT for human or veterinary consumption of any kind, including but not limited to ingestion, injection, topical application, or any other route of administration.\n\nProducts sold by All-Access Peptides are not medications, are not dietary supplements, and are not FDA-approved for the treatment, cure, mitigation, prevention, or diagnosis of any disease or condition. No statement on this website should be interpreted as a medical, therapeutic, or efficacy claim of any kind.\n\nAll-Access Peptides does not provide, and this website does not contain, any dosing, titration, reconstitution, or administration protocols or guidance of any kind. Customers seeking such information should look elsewhere; providing it is outside the scope of a research supplier.\n\nEvery account holder is required to affirmatively certify, at registration, that they are a qualified researcher or are creating the account on behalf of a research institution or organization. By purchasing, the customer additionally represents that products will be handled by individuals trained in safe laboratory practices.\n\nEvery order also requires a separate affirmative acknowledgement of this disclaimer before payment can be submitted.`,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    body: `Shipping Methods\n\nAll-Access Peptides ships orders via reputable carriers (such as USPS, UPS, FedEx, or other courier services) to addresses within the continental United States (the 48 contiguous states and Washington, D.C.). We do not currently ship to Alaska, Hawaii, U.S. territories, or internationally. During checkout, you may be offered shipping options (standard, expedited, overnight, etc.) depending on your location. The delivery times associated with these options are estimates provided by the carriers and are not guaranteed by All-Access Peptides. Once your order is shipped, you will receive a confirmation email with tracking information (if available for the chosen shipping method). Orders that meet the free-shipping threshold shown in your cart qualify for free shipping on eligible methods.\n\nShipping Guarantee\n\nWe guarantee that any order which has completed payment and verification before 2:00 PM (Pacific Time) on a business day will be shipped out from our facility that same business day. Orders completed after 2:00 PM, or on a weekend or holiday, will be shipped out the next business day. If we fail to meet this guarantee, we will refund the shipping costs you paid for that order. This refund will be processed back to your original payment method (or provided as store credit, if you prefer) once we confirm the shipping delay was on our end.\n\nVerification Delays\n\nThe shipping guarantee above applies only once your order has been fully verified (payment confirmed and any required checks completed). If an order is held up because we are awaiting additional information from you, or due to any issue in verifying the payment or order details, that delay is excluded from the shipping guarantee. In such cases, the shipping-cost refund policy for delayed shipment will not apply. For example, if we contact you for age verification or address confirmation and the order is shipped later than the guarantee above due to awaiting your response, no shipping refund will be given for that delay.\n\nIncomplete or Inaccurate Information\n\nIt is your responsibility to provide accurate shipping information. If an order cannot be shipped on time because the shipping address you provided is incorrect or incomplete, or because you have not supplied information requested for verification, we are not obligated to refund shipping costs for the delay. We will attempt to contact you to resolve such issues, but the shipping guarantee will apply only once all issues are resolved.\n\nRisk of Loss\n\nTitle to the products and risk of loss pass to you once we hand over the package to the shipping carrier. After we ship your order, it is the carrier's responsibility to deliver it safely. All-Access Peptides is not liable for delays, losses, or damage to packages while in transit with the carrier. However, we will assist you in working with the carrier to resolve issues such as lost or delayed packages. If a shipment is lost or damaged in transit, please notify us and we will initiate a claim with the carrier; refunds or replacements for lost or damaged goods will be handled in accordance with the carrier's insurance policies and our own discretion.\n\nDelivery Confirmation\n\nThe carrier's record of delivery (for example, a delivery confirmation or tracking update showing the package was delivered to the address provided) will serve as proof of delivery. It is your responsibility to promptly secure the package upon delivery. We are not responsible for theft or loss of packages after delivery is confirmed. If you have concerns about package security, consider requesting signature confirmation or make arrangements to collect your package from the carrier's facility.`,
  },
  {
    slug: 'refund-policy',
    title: 'Refund & Return Policy',
    body: `Refund Summary\n\nWe stand behind every order. Refunds are generally available on eligible unopened, unused, and sealed products within seven (7) days of confirmed delivery. If your order arrives damaged, incorrect, incomplete, or another issue occurs, contact us and we will work quickly toward a fair resolution. Our goal is to resolve every issue directly and promptly so you never need to contact your financial institution.\n\nHow to Start a Return\n\nReturns require prior authorization. Contact support@all-accesspeptides.com with your order number before sending anything back, and we will confirm eligibility and share return instructions. Items sent without authorization, or outside the seven-day window, may not be accepted, and returned items should be shipped with tracking.\n\nDamaged Shipments\n\nIf your shipment arrives visibly damaged, contact support@all-accesspeptides.com within 7 days of delivery with your order number and photographs of the packaging and contents. We will review eligible claims and arrange a replacement or refund for the affected items.\n\nIncorrect Shipments\n\nIf you receive an item that does not match your order, contact support@all-accesspeptides.com within 7 days of delivery with your order number. After verification, we will correct the error by shipping the correct item or issuing a refund for the affected items.\n\nMissing or Lost Shipments\n\nIf tracking shows your order as delivered but you have not received it, or a shipment appears lost in transit, contact support@all-accesspeptides.com with your order number (and tracking number, if you have it). We will open an investigation with the carrier and, where a shipment is confirmed lost, arrange a replacement or refund for the affected items.\n\nInspection & Refunds\n\nOnce an authorized return is received and inspected, we will process your refund or replacement promptly. Refunds are generally issued to the original payment method whenever possible.\n\nFair Use, Fraud & Abuse\n\nThese customer-first terms are offered in good faith. We may decline a claim or limit future orders in cases of misuse — such as returning opened or used materials represented as unopened, or repeated or fraudulent refund or dispute activity — consistent with our Terms & Conditions. These measures protect legitimate customers and the integrity of our research materials.\n\nFor Research Use Only\n\nAll materials are supplied strictly for laboratory and research use. We make no representation regarding safety, efficacy, or fitness for any particular research application, and we do not provide usage guidance. See our Research Use Disclaimer.`,
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

  console.log('Applying product renames...')
  for (const r of RENAMES) {
    const existing = await prisma.product.findUnique({ where: { sku: r.fromSku } })
    if (!existing) continue // nothing to migrate — a fresh DB seeds directly under the new name/SKU
    await prisma.product.update({
      where: { id: existing.id },
      data: { name: r.toName, sku: r.toSku, slug: slugify(r.toName, existing.vialSize) },
    })
    console.log(`  ${r.fromSku} -> ${r.toSku} (${r.toName})`)
  }

  console.log('Seeding products (no prices, no inventory — set via admin)...')
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i]
    const slug = SLUG_OVERRIDES[p.sku] ?? slugify(p.name, p.vialSize)
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

  console.log('Removing categories merged into others...')
  for (const slug of MERGED_CATEGORY_SLUGS) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    })
    if (!category) continue
    if (category._count.products > 0) {
      // Shouldn't happen — the product upsert loop above reassigns every
      // product to its new category slug first. Leave it rather than
      // silently deleting a category that still holds products.
      console.log(`  "${slug}" still has ${category._count.products} product(s) — left in place.`)
      continue
    }
    await prisma.category.delete({ where: { id: category.id } })
    console.log(`  Merged category "${slug}" removed.`)
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

  console.log('Seeding live-carrier shipping methods (Shippo)...')
  // Matched by name, created once each — never overwrites an existing row,
  // so an admin who has already edited/reordered/deactivated one of these
  // (or added it manually before this ran) is left untouched.
  const LIVE_CARRIER_METHODS: {
    name: string
    carrierServiceToken: string
    deliveryEstimate: string
    freeShippingEligible: boolean
    sortOrder: number
  }[] = [
    { name: 'UPS Ground', carrierServiceToken: 'ups_ground', deliveryEstimate: '1–5 business days', freeShippingEligible: true, sortOrder: 10 },
    { name: 'UPS Ground Saver', carrierServiceToken: 'ups_ground_saver', deliveryEstimate: '3–7 business days', freeShippingEligible: true, sortOrder: 11 },
    { name: 'USPS Ground Advantage', carrierServiceToken: 'usps_ground_advantage', deliveryEstimate: '2–5 business days', freeShippingEligible: true, sortOrder: 12 },
    { name: 'USPS Priority Mail', carrierServiceToken: 'usps_priority', deliveryEstimate: '1–3 business days', freeShippingEligible: false, sortOrder: 20 },
    { name: 'UPS 3 Day Select', carrierServiceToken: 'ups_3_day_select', deliveryEstimate: '3 business days', freeShippingEligible: false, sortOrder: 21 },
    { name: 'UPS 2nd Day Air', carrierServiceToken: 'ups_second_day_air', deliveryEstimate: '2 business days', freeShippingEligible: false, sortOrder: 22 },
  ]
  for (const method of LIVE_CARRIER_METHODS) {
    const existing = await prisma.shippingMethod.findFirst({ where: { name: method.name } })
    if (existing) continue
    await prisma.shippingMethod.create({
      data: {
        name: method.name,
        rateType: 'LIVE_CARRIER',
        carrierServiceToken: method.carrierServiceToken,
        priceCents: 0, // ignored for LIVE_CARRIER — rate is fetched from Shippo per order
        deliveryEstimate: method.deliveryEstimate,
        active: true,
        freeShippingEligible: method.freeShippingEligible,
        sortOrder: method.sortOrder,
      },
    })
    console.log(`  Added shipping method "${method.name}"`)
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
