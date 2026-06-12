# AGENTS.md

## Cursor Cloud specific instructions

Nova Market is a single Next.js 15 (App Router) full-stack e-commerce marketplace. There is one service: the Next.js dev server (frontend + API routes) backed by a local **SQLite** file. No Docker, no separate DB daemon, and no external services are required for local development.

### Running the app
- Start the dev server with `npm run dev` (serves on `http://localhost:3000`). The `dev`/`build`/`start` scripts inline `DATABASE_URL=file:./dev.db`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`, so no `.env` file is needed for local work.
- `npm run full:start` chains DB setup + `npm run dev`. The startup update script already runs the DB setup steps (`db:generate`, `db:push`, `db:seed`), so for a fresh session you can just run `npm run dev` directly.

### Database notes
- The local DB lives at `prisma/dev.db` (the SQLite file Prisma resolves from `prisma/schema.sqlite.prisma`). It is gitignored, so it is recreated and reseeded on each VM startup by the update script.
- `prisma/seed.ts` is destructive/idempotent: it deletes all rows then reseeds. Re-running `npm run db:seed` resets to a clean seeded state.
- All `db:*` scripts use the SQLite schema (`prisma/schema.sqlite.prisma`). The `db:*:postgres` scripts and `prisma/schema.prisma` are for production only and are not needed locally.

### Seeded login credentials
- Admin: `admin@marketplace.local` / `Admin123!`
- Seller: `seller@marketplace.local` / `Seller123!`
- Customer: `customer@marketplace.local` / `Customer123!`
- Coupon code: `WELCOME10`

### Lint / typecheck / build
- `npm run lint`, `npm run typecheck`, `npm run build` (see `package.json`).

### Stripe (optional)
- Checkout/payment and the `/api/stripe/webhook` flow require real Stripe test keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`). Without them the app still boots and runs; only the checkout/payment path fails. These are not needed for general development or for the login/browse/cart flows.
