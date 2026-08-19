# Architecture

## Layout

```
app/                    Routes (App Router)
  actions/              Server actions (auth, cart, admin)
  api/                  Route handlers: checkout intent, Stripe webhook, COA files, cron
  admin/                Back office (role-guarded server components)
  …                     Storefront pages
components/             Shared UI (header, product cards, forms, vial imagery)
lib/                    Business logic — the only place money/inventory/promo math lives
  auth.ts               Sessions (hashed tokens), password hashing, route guards
  cart.ts / pricing.ts  Authoritative cart pricing, promo validation
  orders.ts             Order creation + idempotent, transactional payment finalization
  payments/             Payment provider abstraction (Stripe adapter)
  tax.ts                Tax provider abstraction (Stripe Tax / flat / none)
  email/                Email provider abstraction (Resend / console) + branded templates
  storage.ts            Private file storage abstraction (COA PDFs)
  welcome.ts            Unique account-linked welcome promotions
  abandoned-carts.ts    Abandoned-cart job logic
  settings.ts           DB-backed store settings (all configurable business rules)
  audit.ts / rate-limit.ts / constants.ts
prisma/                 Schema, migrations, seed (catalog without prices/inventory)
scripts/create-admin.ts Secure Super Admin bootstrap (env-driven)
```

## Money & calculation

All amounts are **integer cents**. The authoritative formula (server-only, `lib/cart.ts`):

```
subtotal − bulk discount − promo discount + shipping + tax = total
```

- Bulk tiers come from settings (`discounts.bulkTiers`), applied per line by quantity;
  effective unit price is rounded to a cent, line total = effective unit × qty.
- Exactly one promo per cart (schema holds a single `promoCodeId`); `validatePromoCode`
  re-checks activation window, min purchase, global/per-customer limits, and welcome-code
  account binding at **every** pricing pass and again at order creation.
- The client never supplies prices, discounts, tax, shipping, or inventory — checkout re-derives
  everything from the database.

## Payment lifecycle

1. `POST /api/checkout/intent` re-prices the cart, validates stock and the promo, resolves
   shipping (free-threshold aware), calculates tax, creates a `PENDING` order **snapshot**
   (items, prices, addresses, disclaimer acceptance) and a Stripe PaymentIntent whose amount is
   the server-computed total.
2. Client confirms via Payment Element → Stripe redirects to `/checkout/success`.
3. Finalization happens in `finalizeOrderPayment(providerPaymentId)`, reachable from **both**
   the verified webhook and the success page — and it:
   - re-verifies status **and amount** with Stripe (never trusts the caller),
   - claims the order with a conditional `updateMany` so exactly one caller finalizes (idempotent),
   - decrements inventory atomically (`WHERE inventoryQty >= qty`) inside the same transaction —
     two buyers can never take the last unit; a paid-but-outsold order is flagged for admin
     resolution instead of going negative,
   - records the promo redemption and (for welcome codes) marks the one-time redemption and
     deactivates the code,
   - converts the cart (so no abandoned-cart email fires), then sends confirmation +
     admin notifications outside the transaction.
4. Failed payments only mark payment/order `FAILED` — inventory, promo uses, and the welcome
   discount are untouched because nothing is consumed before verified payment.

## Inventory

- Never reserved by carts; clamped when adding to cart, revalidated on cart view and at
  checkout, enforced atomically at finalization.
- Every change (sale, restock, correction, damage, refund restock) is an
  `InventoryTransaction` with prev/new/delta, reason, actor, and optional order linkage.

## Auth & security

- Sessions: 32-byte random tokens, **SHA-256-hashed at rest**, httpOnly/secure/lax cookies,
  14-day expiry, revoked on password reset/account disable.
- Passwords: bcrypt cost 12. One-time tokens (verification/reset) are hashed, single-use, expiring.
- Guards: `requireUser` (verified customers) and `requireAdmin` run **inside** every protected
  server component/action/route — protection never relies on the client or on middleware alone.
- Server actions + route handlers validate input with zod/whitelists; rate limiting covers
  login, registration, resets, promo attempts, and checkout.
- Admins cannot set payment status; fulfillment transitions are whitelisted and unpaid orders
  cannot enter fulfillment. Refunds go through the payment provider.
- Audit log records admin mutations with before/after values.
- COA PDFs live outside the web root, path-traversal-safe keys, authenticated streaming only —
  with one deliberate, narrowly-scoped public exception: `/verify/[slug]` and
  `/api/verify/[slug]/file` (the QR-code destination on physical labels) serve only the current,
  active COA for an active product, unauthenticated, with no listing/enumeration of other
  documents or products.

## Extensibility (deliberate seams)

- `PaymentProviderAdapter`, `EmailProvider`, tax provider switch, and `lib/storage.ts` are small
  interfaces — swap Stripe/Resend/local-disk without touching business logic.
- Roles are string-based with two levels today (`SUPER_ADMIN`, `ADMIN`) and a single
  `isAdminRole`/`requireAdmin` chokepoint for adding fulfillment/support/inventory roles.
- Lots/batches already model product → lot → COA so new lots keep historical documentation.
- Categories, shipping methods, bulk tiers, thresholds, email timing, and legal text are all
  rows/settings — future features (wholesale, loyalty, reviews, multi-warehouse) attach as new
  tables without schema rewrites.
