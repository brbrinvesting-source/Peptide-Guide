# Deployment Guide

## 1. Requirements

- Node.js 20+ (22 recommended)
- A **Postgres** database (this project uses Netlify DB, which is Neon under the hood — provision
  it from the Netlify site's **Database** tab)
- A **Stripe** account (payments; enable **Stripe Tax** for dynamic sales tax)
- A transactional email provider (Resend supported out of the box)
- A host that supports Next.js SSR **with a persistent or external file store** for COA PDFs —
  this project deploys on **Netlify**, whose functions have an *ephemeral* filesystem (see §7)

## 2. Database

The schema targets Postgres directly (`prisma/schema.prisma`, `datasource db { provider =
"postgresql" }`). To bootstrap a brand new database (only needed once, or after a schema change
with no migrations committed yet):

```bash
DATABASE_URL="<your Postgres connection string>" npx prisma migrate dev --name init
```

This creates `prisma/migrations/` and applies it directly. Commit and push that folder — every
subsequent Netlify build runs `prisma migrate deploy` automatically (it's part of the `build`
script in `package.json`), so future schema changes just need a normal migration committed to
the repo; no manual production migration step required after this first one.

Notes:
- All money fields are integer cents — no decimal-type concerns.
- Search uses `contains`; on Postgres add `mode: 'insensitive'` in the catalog/COA queries or
  add trigram indexes if case-sensitivity becomes an issue.

## 3. Environment variables

See `.env.example` for the full annotated list. Production checklist:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://all-accesspeptides.com` — used in emails/redirects |
| `SITE_TIMEZONE` | recommended | IANA zone for displayed dates (default `America/Los_Angeles`). Without it the host's zone (UTC on Netlify) is used, so evening orders show the next day |
| `STRIPE_SECRET_KEY` | ✅ | Live secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Live publishable key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From the webhook endpoint you create (step 4) |
| `POSTMARK_API_TOKEN` | ✅ | Or `RESEND_API_KEY`, or `EMAIL_PROVIDER=console` (dev only) |
| `CRON_SECRET` | ✅ | Long random string for the abandoned-cart endpoint |
| `FILE_STORAGE_DIR` | not on Netlify | COA PDFs use Netlify Blobs automatically on Netlify; this only matters for local dev (see §8) |
| `SHIPPO_API_KEY` | only if used | Required for any shipping method set to "Live carrier rate" in Admin -> Settings |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | once | Bootstraps/promotes the Super Admin automatically on every build (idempotent — safe to leave set, or remove after the first successful deploy) |

## 4. Stripe configuration

1. **API keys**: Dashboard → Developers → API keys.
2. **Webhook**: add endpoint `https://<site>/api/webhooks/stripe` with events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.processing`
   - `charge.refunded`
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. **Stripe Tax**: enable in Dashboard → Tax, register jurisdictions as legally required.
   The app calls the Tax Calculation API per checkout. (Admin → Settings → Tax can switch to
   `flat`/`none` modes, but `stripe` is the intended production mode.)
4. Test with Stripe test keys + `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## 5. Shipping (live carrier rates, optional)

Shipping methods default to flat prices set in Admin → Settings. To offer live-calculated rates
(e.g. 2-Day Air, Next Day Air):

1. Create a [Shippo](https://goshippo.com) account and grab an API token (Settings → API) →
   set `SHIPPO_API_KEY`.
2. In **Admin → Settings → Shipping origin & packaging**, fill in the ship-from street address
   (city/state/ZIP default to Glendale, CA 91206) and typical package dimensions.
3. In **Admin → Settings → Shipping methods**, add a method with rate type "Live carrier rate"
   and a Shippo service token (e.g. `ups_second_day_air`, `ups_next_day_air`). Token names vary by
   account/carrier setup — if a token 404s with "not available for that address," check the
   server logs for `Shippo: no rate for service "..."`, which lists every token your account
   actually returned so you can copy the exact spelling.
4. Set an accurate **shipping weight** per product in **Admin → Products** (defaults to 4 oz) —
   live rates are calculated from real package weight, so this matters for pricing accuracy.

The live rate is always recalculated server-side at order creation regardless of what the
customer's browser displayed — the client-side quote is preview-only.

## 6. First deploy

```bash
npm ci
npx prisma migrate deploy
npm run db:seed                  # idempotent; never overwrites admin-edited content
INITIAL_ADMIN_EMAIL=... INITIAL_ADMIN_PASSWORD=... npm run create-admin
npm run build
npm start
```

Then in **Admin → Settings** configure: contact info, shipping methods + free-shipping
threshold, tax provider, sender identity, admin notification email, welcome discount, and review
all legal pages (seeded text is placeholder language).
Set prices/inventory in **Admin → Products / Inventory** and upload COAs in **Admin → COA
Management** — nothing is hard-coded.

## 7. Scheduled jobs

A Netlify Scheduled Function (`netlify/functions/abandoned-carts-cron.mts`) already calls
`POST /api/cron/abandoned-carts` every 15 minutes automatically — no external cron service or
manual scheduling needed. It's picked up automatically on deploy since `netlify.toml` points
Netlify at the `netlify/functions` directory.

The only setup step is setting `CRON_SECRET` in Netlify's environment variables (same value the
route and the scheduled function both read) — generate one with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

If `CRON_SECRET` isn't set, the scheduled function logs a warning and skips its run rather than
failing loudly — check the function's logs in Netlify (Functions tab) if abandoned-cart emails
aren't going out.

If you ever need to trigger it manually instead (e.g. testing without waiting 15 minutes):

```
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/abandoned-carts
```

## 8. File storage (COAs & product images)

- COA PDFs are stored **outside** the public web root and streamed only to authenticated users
  via `/api/coa/[id]/file`. `lib/storage.ts` picks the backend automatically:
  - **On Netlify** (`NETLIFY=true`, set automatically in every Netlify build/function runtime):
    files go to **Netlify Blobs** — durable, survives deploys, no extra credentials needed.
  - **Everywhere else** (plain `next dev` locally): falls back to the local filesystem at
    `FILE_STORAGE_DIR` (default `./storage`), so local development needs no Netlify-specific
    setup. This path is **not durable** on a serverless host — it exists for local dev only.
  - The interface (`storeFile`/`readStoredFile`/`deleteStoredFile`) is deliberately small so a
    different backend (S3, R2) could replace either branch later without touching call sites.
- Admin-uploaded product images are written to `public/uploads/` (self-hosted) or you can paste
  an external image URL instead — on serverless/immutable-filesystem hosts, use the URL option
  with your CDN/bucket.

## 9. Hosting notes (Netlify)

- The repo includes `netlify.toml`, already configured for Netlify's official Next.js runtime
  (`@netlify/plugin-nextjs`) — connecting the GitHub repo as a new Netlify site should need no
  extra build configuration.
- **Netlify's functions have an ephemeral filesystem.** `FILE_STORAGE_DIR` (COA PDFs) and
  admin-uploaded product image *files* will not persist between requests/deploys on Netlify as
  currently implemented — only the "paste an image URL" option is safe to use for product images
  on Netlify today. Before uploading real COAs in production, this needs an external object
  store (Cloudflare R2 or S3) wired into `lib/storage.ts`, whose interface was deliberately kept
  small for exactly this swap. Flag this before relying on COA uploads in production.
- HTTPS is provisioned automatically once a custom domain's DNS is verified in Netlify's
  **Domain management**.

## 10. Post-deploy verification

1. Register a customer → verify email → welcome email contains a unique `WELCOME-…` code.
2. Set a price/inventory on one product → buy it with Stripe test card `4242 4242 4242 4242`.
3. Confirm: order goes PAID, inventory decrements, confirmation email sends, webhook log clean.
4. Test a failed card (`4000 0000 0000 0002`): order shows FAILED, inventory unchanged, promo
   not consumed.
5. Upload a COA → verify View COA appears on the product card, product page, and COA center.
