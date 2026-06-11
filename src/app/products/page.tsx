import { getCategories, getProducts } from "@/lib/data";
import { ProductCard } from "@/components/products/product-card";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = {
    query: typeof params.q === "string" ? params.q : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    brand: typeof params.brand === "string" ? params.brand : undefined,
    minPrice: typeof params.min === "string" ? Number(params.min) : undefined,
    maxPrice: typeof params.max === "string" ? Number(params.max) : undefined,
    rating: typeof params.rating === "string" ? Number(params.rating) : undefined,
    sort: typeof params.sort === "string" ? (params.sort as "price_asc" | "price_desc" | "newest" | "popularity") : "newest",
  };

  const [categories, products] = await Promise.all([getCategories(), getProducts(filters)]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-zinc-900">All Products</h1>
        <p className="text-sm text-zinc-600">Browse, filter, and sort listings across all marketplace categories.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Filters</h2>
          <form className="mt-3 space-y-3" action="/products">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Search</label>
              <input name="q" defaultValue={filters.query} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Category</label>
              <select name="category" defaultValue={filters.category} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option value={category.slug} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Min price</label>
                <input type="number" min={0} name="min" defaultValue={filters.minPrice} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Max price</label>
                <input type="number" min={0} name="max" defaultValue={filters.maxPrice} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Brand</label>
              <input name="brand" defaultValue={filters.brand} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Minimum rating</label>
              <select name="rating" defaultValue={filters.rating} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="">Any</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Sort by</label>
              <select name="sort" defaultValue={filters.sort} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
            <button className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700" type="submit">
              Apply filters
            </button>
          </form>
        </aside>

        <section>
          <p className="mb-4 text-sm text-zinc-600">{products.length} products found</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
