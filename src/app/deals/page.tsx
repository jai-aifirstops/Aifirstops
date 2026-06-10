import { getFeaturedDeals } from "@/lib/data";
import { ProductCard } from "@/components/products/product-card";

export default async function DealsPage() {
  const deals = await getFeaturedDeals(24);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-zinc-900">Deals & Promotions</h1>
        <p className="mt-1 text-sm text-zinc-600">Limited-time offers curated from top-selling categories.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {deals.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
