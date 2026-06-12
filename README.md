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

## One-Command Smoke Test

Run a full end-to-end validation in one command:

```bash
npm run smoke:test
```

`smoke:test` automatically validates:

- DB bootstrap/generate/push/seed
- Typecheck, lint, build
- Server startup and route accessibility
- Customer/admin auth flows and RBAC
- Seeded product and order presence
- Cart/wishlist/order pages
- Admin pages
- Upload and support APIs

The smoke test uses an automatically selected free localhost port, so it won't conflict with an already-running dev server.

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
- `npm run smoke:test`

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

1. Create a PostgreSQL database (Supabase/Neon).
2. Set Vercel env vars (especially `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
3. Run Prisma with PostgreSQL schema:

```bash
npm run db:generate:postgres
npm run db:push:postgres
npm run db:seed:postgres
```

4. Deploy to Vercel.
5. Configure Stripe webhook endpoint:
   - `https://<your-domain>/api/stripe/webhook`
   - Event: `checkout.session.completed`

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
