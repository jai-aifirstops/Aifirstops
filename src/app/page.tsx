import Link from "next/link";
import { getCategories, getFeaturedDeals, getProducts } from "@/lib/data";
import { ProductCard } from "@/components/products/product-card";

export default async function HomePage() {
  const [categories, deals, latest] = await Promise.all([
    getCategories(),
    getFeaturedDeals(4),
    getProducts({ sort: "newest" }),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-700 px-6 py-10 text-white md:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">Modern Marketplace</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight md:text-5xl">
          Shop trusted brands across categories in one seamless platform.
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-200">
          Discover curated deals, secure Stripe checkout, and personalized order tracking from storefront to delivery.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/products" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200">
            Browse products
          </Link>
          <Link href="/deals" className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            View deals
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">Shop by category</h2>
          <Link href="/products" className="text-sm font-semibold text-zinc-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400"
            >
              <h3 className="font-semibold text-zinc-900">{category.name}</h3>
              <p className="mt-1 text-sm text-zinc-600">{category._count.products} products</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">Featured deals</h2>
          <Link href="/deals" className="text-sm font-semibold text-rose-600 hover:underline">
            More deals
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">New arrivals</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latest.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
