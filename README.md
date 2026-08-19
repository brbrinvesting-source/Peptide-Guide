# All-Access Peptides — Ecommerce Platform

Production-grade ecommerce application for **All-Access Peptides** (all-accesspeptides.com):
a research-use-only compound catalog with COA documentation, Stripe payments, dynamic tax,
bulk + promo discounts, transactional email, and a full admin back office.

> All products are positioned strictly **FOR RESEARCH USE ONLY — NOT FOR HUMAN OR VETERINARY
> CONSUMPTION**. Every checkout requires an affirmative research-use acknowledgement which is
> versioned and stored with the order.

## Stack

- **Next.js 16** (App Router, server components + server actions) · TypeScript · Tailwind CSS 4
- **Prisma ORM** — Postgres (money stored as integer cents; dev and prod both use a real Postgres instance, e.g. Netlify DB / Neon)
- **Stripe** (Payment Element + verified webhooks + Stripe Tax) behind a payment-provider abstraction
- **Email** behind a provider abstraction — Resend over HTTPS, or `console` provider in dev
- **Private file storage** for COA PDFs (never in `public/`), served through authenticated routes

## Quick start (development)

```bash
npm install
cp .env.example .env            # fill in values (defaults work for a local demo)
npm run db:setup                # applies migrations + seeds catalog/legal pages
INITIAL_ADMIN_EMAIL=you@example.com INITIAL_ADMIN_PASSWORD='a-long-password' npm run create-admin
npm run dev
```

- Storefront: http://localhost:3000 — Admin: http://localhost:3000/admin
- With `EMAIL_PROVIDER=console`, all emails (verification links, welcome codes, order
  confirmations) are printed to the server console.
- The seed creates the full 42-product catalog **without prices or inventory** — both are set
  through Admin → Products / Inventory, exactly as in production.

## Key behaviors

| Area | Rule |
|---|---|
| Catalog access | Account + verified email required; enforced server-side on every catalog/COA/cart/checkout route and API |
| Availability | Customers see only In Stock / Low Stock / Sold Out — never exact quantities |
| Bulk discounts | Configurable tiers (default 5–9 → 5%, 10+ → 10%), applied automatically per line |
| Promo codes | Max **one per order**, stacks **with** bulk discount; all rules re-validated server-side |
| Welcome promo | Shared, fixed code (default `WELCOME20`, configurable) emailed to every verified customer; each account may redeem it once, enforced server-side |
| Rewards points | Earn 1 point per $10 of merchandise spend (after all other discounts), redeem 100 points = $1 off at checkout — both rates admin-configurable. Earned only once payment is confirmed; a full refund reverses redeemed points and claws back earned points (best-effort, never below zero) |
| Referrals | Every account gets a shareable `/r/[code]` link, captured once at registration. A referred customer's first paid order gets 2x points plus an automatic 10% discount (no code, stacks with a manually-entered promo). The referrer earns 2x points on every purchase their referrals ever make, for life. All multipliers/rates admin-configurable |
| Inventory | Decremented **only after payment is verified with Stripe**, atomically (`UPDATE … WHERE qty >= n`) — no overselling, no cart reservations |
| Payments | Client success screens are never trusted; orders finalize via webhook and/or server-side verification, idempotently |
| Tax | Destination-based via Stripe Tax (configurable: stripe / flat / none) |
| Shipping | US-only (50 states), configurable methods + free-shipping threshold (default $250). Methods can be flat-rate or live carrier rates (via Shippo) calculated per order from the ship-from address, package weight, and destination — never trusted from the client |
| Shipping insurance | Optional customer-elected add-on, priced by admin-configurable tiers on the merchandise subtotal (before shipping/tax/discounts); recalculated server-side at order creation |
| COAs | Product → lot/batch → COA architecture; replacing a current COA keeps history; PDFs served to authenticated users through `/api/coa/[id]/file`, plus a narrow public exception (below) |
| Label QR verification | `/verify/[slug]` is a public, read-only, unauthenticated page — the QR-code destination printed on vial labels — showing only the current lot/testing date/COA for that exact product; no pricing, catalog, or purchasing surface. Generated per product (PNG/SVG) in Admin → QR Codes |
| Claims | Default UI shows "COA available" only. A "Verified Purity" badge (with the documented %) is an **admin-controlled, opt-in toggle per COA** — off by default, never inferred from a file upload, meant to be flipped on the moment lab testing for that lot completes |
| Admin | Role-based (SUPER_ADMIN / ADMIN), audited actions, payment status never manually settable |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run db:setup` | `migrate deploy` + seed |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:seed` | Seed catalog, settings, legal pages (idempotent, never overwrites admin edits) |
| `npm run create-admin` | Bootstrap the first Super Admin from env vars |

## Scheduled jobs

Abandoned-cart emails are sent by `POST /api/cron/abandoned-carts` (Bearer `CRON_SECRET`).
Run it every ~15 minutes from any scheduler:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/abandoned-carts
```

Timing (default 90 min), subject line, and opt-out behavior are configurable in Admin → Settings.

## Documentation

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production deployment, Postgres migration, Stripe/webhook/tax setup, file storage, environment variables
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — data model, payment/inventory flows, security model
- [`.env.example`](.env.example) — every environment variable, annotated

## Compliance notes

- No medical, therapeutic, or efficacy claims anywhere in UI, seed data, or emails
- Research-use notice on homepage, product pages, checkout (required checkbox), and all emails
- **Registration requires a researcher attestation.** Every new account must check a required,
  server-enforced certification ("I certify that I am creating this account as a qualified
  researcher…") before the account is created; the acceptance timestamp and text version are
  stored on the account and audit-logged. Version is configurable via
  `legal.researcherAttestationVersion` in Admin → Settings (bump it if the wording changes)
- **No dosing/titration/reconstitution content anywhere.** There is no dosing calculator, cycle
  builder, or reconstitution guide in this codebase, and the admin product form explicitly warns
  against entering any such content in descriptions or specifications
- **No general-use supplies.** Bacteriostatic Water and any other non-research-labeled supply
  item are excluded from the catalog; the seed script actively removes them (or deactivates them
  if they have order history) from any previously-seeded database
- Legal pages (Terms, Privacy, Research Disclaimer, Shipping, Refund) are database-backed and
  editable in Admin → Settings; seeded text is placeholder language for counsel review
- Raw card data never touches the server (Stripe Payment Element); webhook signatures verified
- Disclaimer acceptances (checkout) and researcher attestations (registration) are both stored
  with version, text, timestamp, and customer — two separate, independently versioned records
