# Nova Market - Full-Stack E-Commerce Marketplace

Production-style marketplace built with:

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- NextAuth (credentials auth)
- Stripe Checkout (test mode)
- Local image upload API (`/api/upload`)
- Role-based access (`CUSTOMER`, `SELLER`, `ADMIN`)

## Implemented Features

### Customer Experience

- Home page with category and deal discovery
- Product listing with filters: category, price range, rating, brand
- Sorting: newest, price low/high, popularity
- Search results page
- Category pages
- Product detail page with recommendations and reviews
- Cart persistence in database for authenticated users
- Wishlist
- Stripe-powered checkout flow (test mode)
- Orders list and order detail pages
- Refund request flow
- Profile page
- Deals page
- Help/contact page with support tickets

### Admin Experience

- Admin dashboard overview
- Product CRUD (create/edit/delete)
- Category CRUD (create/delete)
- Inventory management + logs
- Order status management
- User role management
- Seller verification management
- Coupon/discount management
- Review moderation
- Sales analytics and revenue chart
- Low-stock alerts
- Refund/status management

### Platform Foundations

- Prisma schema for marketplace domain
- Seed script with realistic sample data
- Email-ready notification abstraction (`src/lib/notifications.ts`)
- Stripe webhook handling for paid orders
- Responsive UI for mobile and desktop

---

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Set at least:

- `DATABASE_URL` to your PostgreSQL database
- `NEXTAUTH_SECRET` (strong random string)
- `NEXTAUTH_URL` (`http://localhost:3000`)
- Stripe test keys:
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`

### 3) Database and seed

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4) Run app

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## Seeded Local Test Credentials

- **Admin**: `admin@marketplace.local` / `Admin123!`
- **Seller**: `seller@marketplace.local` / `Seller123!`
- **Customer**: `customer@marketplace.local` / `Customer123!`
- **Coupon**: `WELCOME10`

---

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - lint code
- `npm run typecheck` - TypeScript check
- `npm run db:generate` - generate Prisma client
- `npm run db:push` - sync schema to DB
- `npm run db:migrate` - create/apply Prisma migrations
- `npm run db:seed` - seed sample data

---

## Deployment (Vercel + Supabase/Neon PostgreSQL)

### Database (Supabase/Neon)

1. Create a PostgreSQL instance.
2. Copy connection string into `DATABASE_URL`.
3. Run schema push/migrations from local or CI:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Vercel

1. Import repository in Vercel.
2. Add env vars from `.env.example`.
3. Set `NEXTAUTH_URL` to your deployed URL.
4. Deploy.

### Stripe

1. Use Stripe test keys in environment vars.
2. Configure webhook endpoint to:
   - `https://<your-domain>/api/stripe/webhook`
3. Subscribe to `checkout.session.completed`.
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

---

## Notes

- This project intentionally avoids any protected marketplace branding/assets.
- Payments are test-only via Stripe test mode.
- Local upload stores files under `public/uploads` (or custom `UPLOAD_DIR`).
