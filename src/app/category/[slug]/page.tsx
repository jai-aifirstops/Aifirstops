import { notFound } from "next/navigation";
import { getCategoryBySlug, getProducts } from "@/lib/data";
import { ProductCard } from "@/components/products/product-card";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const products = await getProducts({ category: slug, sort: "popularity" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-zinc-900">{category.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">{category.description || "Explore products in this category."}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
