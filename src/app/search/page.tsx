import { getProducts } from "@/lib/data";
import { ProductCard } from "@/components/products/product-card";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const products = await getProducts({ query, sort: "popularity" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-zinc-900">Search Results</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Showing {products.length} result{products.length === 1 ? "" : "s"} for <strong>{query || "all products"}</strong>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
