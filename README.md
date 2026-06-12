# Nova Market - Full-Stack E-Commerce Marketplace

Modern multi-vendor marketplace built with:

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- NextAuth (credentials)
- Stripe Checkout (test mode)
- Local image upload API

## Database Setup Strategy

This project now uses:

- **SQLite for local development (zero setup)**
- **PostgreSQL for production (Supabase/Neon/Vercel)**

No manual PostgreSQL installation is required for local use.

---

## One-Command Local Start (recommended)

```bash
npm install
npm run full:start
```

`full:start` does all of this automatically:

1. Initializes local DB mode (`db:up`)
2. Generates Prisma client for SQLite
3. Pushes schema to SQLite DB
4. Seeds data (admin/seller/customer + products/orders/reviews)
5. Starts Next.js dev server

App URL: [http://localhost:3000](http://localhost:3000)

---

## Seeded Local Login Credentials

- **Admin**: `admin@marketplace.local` / `Admin123!`
- **Seller**: `seller@marketplace.local` / `Seller123!`
- **Customer**: `customer@marketplace.local` / `Customer123!`
- **Coupon**: `WELCOME10`

---

## Scripts

### Local development (SQLite, no external DB required)

- `npm run db:up` - local DB bootstrap step (SQLite mode)
- `npm run db:generate` - generate Prisma client using `schema.sqlite.prisma`
- `npm run db:push` - apply schema to local SQLite DB
- `npm run db:seed` - seed local SQLite DB
- `npm run dev` - start dev server with local DB env
- `npm run full:start` - run all setup + start server in one command

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Production PostgreSQL helpers

- `npm run db:generate:postgres`
- `npm run db:push:postgres`
- `npm run db:migrate:postgres`
- `npm run db:seed:postgres`

---

## Environment Variables

See `.env.example`.

Local development defaults to SQLite via scripts, so no manual DB setup is needed.

For production, set:

- `DATABASE_URL` to your PostgreSQL connection string
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Stripe test/live values as needed

---

## Deployment (Vercel + Supabase/Neon)

Local SQLite support is unchanged; production uses PostgreSQL via `prisma/schema.prisma`.

### 1. Create a PostgreSQL database

Use Supabase, Neon, Vercel Postgres, or any PostgreSQL provider and copy its connection string.

### 2. Set Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, and Preview if used):

| Variable | Required | Value / Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Your PostgreSQL connection string. `prisma/schema.prisma` reads `env("DATABASE_URL")`. Do **not** use `POSTGRES_DATABASE_URL` — it is not read by the app. |
| `NEXTAUTH_SECRET` | **Yes** | Strong random secret, e.g. `openssl rand -base64 32`. (Code falls back to `dev-local-secret` only for local dev.) |
| `NEXTAUTH_URL` | **Yes** | Your deployed URL, e.g. `https://your-app.vercel.app`. Used by NextAuth and for Stripe success/cancel redirects. |
| `STRIPE_SECRET_KEY` | For checkout | Stripe secret key (`sk_test_...` / `sk_live_...`). Without it the app boots but checkout fails. |
| `STRIPE_WEBHOOK_SECRET` | For payment confirmation | From the Stripe webhook endpoint (`whsec_...`). Required for the webhook to mark orders paid, clear carts, and decrement inventory. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Client publishable key (`pk_...`). Not currently referenced in code (checkout uses Stripe-hosted redirect), but safe to set. |
| `UPLOAD_DIR` | Optional | Defaults to `public/uploads`. See serverless caveat below. |

### 3. Build command

Vercel automatically runs the `vercel-build` script, so no extra configuration is needed. The exact command it runs is:

```bash
prisma generate --schema prisma/schema.prisma && next build
```

If you prefer to set it manually in **Settings → Build & Output Settings → Build Command**, use the same string above. (The default `build`/`dev`/`start` scripts intentionally hardcode the local SQLite `DATABASE_URL` and must **not** be used for production.)

### 4. Initialize the production database (one time)

Run locally against the production `DATABASE_URL` (or from a one-off job):

```bash
DATABASE_URL="<your-postgres-url>" npm run db:push:postgres
DATABASE_URL="<your-postgres-url>" npm run db:seed:postgres   # optional: seeds demo data; destructive (wipes all tables first)
```

### 5. Deploy and configure Stripe webhook

1. Deploy to Vercel.
2. In Stripe, add a webhook endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Serverless caveats

- **Image uploads:** `/api/upload` writes to the local filesystem (`public/uploads`), which is **ephemeral and read-only** on Vercel serverless functions. Uploaded files will not persist. For production, switch to external object storage (e.g. Cloudinary/S3). `res.cloudinary.com` and `images.unsplash.com` are already allowed in `next.config.ts`.
- **Prisma engine target:** Generation runs on Vercel during build, so the default target normally matches the runtime. If you hit a Prisma engine error at runtime, add `binaryTargets` to the `generator client` block in `prisma/schema.prisma`.

---

## Implemented Marketplace Scope

### Customer pages
- Home
- Product listing
- Product detail
- Search results
- Category page
- Cart
- Checkout (Stripe test)
- Login/Register
- Profile
- Orders
- Order details
- Wishlist
- Reviews/ratings
- Deals
- Help/contact

### Admin panel
- Dashboard
- Product CRUD
- Category CRUD
- Inventory management + logs
- Order management
- User management
- Seller management
- Coupon/discount management
- Review moderation
- Sales analytics + revenue chart
- Low-stock alerts
- Refund/status management

---

## Notes

- No protected Amazon branding/assets are used.
- Payments are Stripe test-mode only unless you provide live keys.
- Local uploads are saved under `public/uploads`.
