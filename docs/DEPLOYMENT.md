# Deployment Guide

## 1. Requirements

- Node.js 20+ (22 recommended)
- A **Postgres** database (production) — SQLite is for development only
- A **Stripe** account (payments; enable **Stripe Tax** for dynamic sales tax)
- A transactional email provider (Resend supported out of the box)
- A host that supports Next.js SSR **with a persistent or external file store** for COA PDFs

## 2. Switching the database to Postgres

1. In `prisma/schema.prisma` change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL=postgresql://user:pass@host:5432/dbname`
3. Regenerate migrations for Postgres (one-time, from a clean schema):
   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init   # against a dev Postgres
   ```
4. Deploy migrations in production with `npx prisma migrate deploy`, then `npm run db:seed`.

Notes:
- All money fields are integer cents — no decimal-type concerns.
- Search uses `contains`; on Postgres add `mode: 'insensitive'` in the catalog/COA queries or
  add trigram indexes if case-sensitivity becomes an issue (SQLite LIKE was case-insensitive).

## 3. Environment variables

See `.env.example` for the full annotated list. Production checklist:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://all-accesspeptides.com` — used in emails/redirects |
| `STRIPE_SECRET_KEY` | ✅ | Live secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Live publishable key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From the webhook endpoint you create (step 4) |
| `RESEND_API_KEY` | ✅ | Or set `EMAIL_PROVIDER=console` (dev only) |
| `CRON_SECRET` | ✅ | Long random string for the abandoned-cart endpoint |
| `FILE_STORAGE_DIR` | ✅ | Persistent volume path for COA PDFs |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | once | For `npm run create-admin` |

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

## 5. First deploy

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

## 6. Scheduled jobs

Schedule every 15 minutes (cron, GitHub Actions, hosting scheduler):

```
*/15 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/abandoned-carts
```

## 7. File storage (COAs & product images)

- COA PDFs are written to `FILE_STORAGE_DIR` (default `./storage`) — **outside** the public web
  root — and streamed only to authenticated users via `/api/coa/[id]/file`. Point this at a
  persistent volume; the storage interface in `lib/storage.ts` is deliberately small so an
  S3-compatible backend can replace it without touching call sites.
- Admin-uploaded product images are written to `public/uploads/` (self-hosted) or you can paste
  an external image URL instead — on serverless/immutable-filesystem hosts, use the URL option
  with your CDN/bucket.

## 8. Hosting notes

- The repo includes `netlify.toml` for Netlify's Next runtime. On Netlify (or any serverless
  host) the filesystem is ephemeral: use Postgres, an external object store for
  `FILE_STORAGE_DIR` (or a follow-up S3 storage adapter), and image URLs rather than local
  uploads. A single VM/container (e.g. Fly.io, Railway, a VPS behind nginx with TLS) is the
  simplest fully-supported production shape.
- HTTPS is required in production (secure session cookies + HSTS are already configured).

## 9. Post-deploy verification

1. Register a customer → verify email → welcome email contains a unique `WELCOME-…` code.
2. Set a price/inventory on one product → buy it with Stripe test card `4242 4242 4242 4242`.
3. Confirm: order goes PAID, inventory decrements, confirmation email sends, webhook log clean.
4. Test a failed card (`4000 0000 0000 0002`): order shows FAILED, inventory unchanged, promo
   not consumed.
5. Upload a COA → verify View COA appears on the product card, product page, and COA center.
