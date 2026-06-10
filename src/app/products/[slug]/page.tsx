import Image from "next/image";
import { notFound } from "next/navigation";
import { addToCartAction, toggleWishlistAction } from "@/lib/actions";
import { getProductBySlug, getRecommendedProducts } from "@/lib/data";
import { toCurrency } from "@/lib/utils";
import { ProductCard } from "@/components/products/product-card";
import { ReviewForm } from "@/components/reviews/review-form";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || !product.isPublished) {
    notFound();
  }

  const recommendations = await getRecommendedProducts(product.id, product.categoryId);
  const primaryImage = product.images[0]?.url || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200";

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <Image src={primaryImage} alt={product.images[0]?.alt || product.title} width={1200} height={1000} className="h-full w-full object-cover" />
        </div>

        <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{product.brand}</p>
            <h1 className="mt-1 text-3xl font-black text-zinc-900">{product.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{product.description}</p>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-zinc-900">{toCurrency(String(product.price))}</span>
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
              <span className="text-base text-zinc-500 line-through">{toCurrency(String(product.compareAtPrice))}</span>
            )}
          </div>

          <div className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">
            <p>Rating: {product.ratingAvg.toFixed(1)} / 5 ({product.ratingCount} reviews)</p>
            <p>Category: {product.category.name}</p>
            <p>Availability: {product.inventory > 0 ? `${product.inventory} in stock` : "Out of stock"}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={addToCartAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700" disabled={product.inventory <= 0}>
                Add to cart
              </button>
            </form>
            <form action={toggleWishlistAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                Save to wishlist
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900">Ratings & Reviews</h2>
          <div className="space-y-3">
            {product.reviews.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">No reviews yet.</p>
            ) : (
              product.reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">{review.title}</h3>
                    <p className="text-xs font-medium text-zinc-600">{review.rating}/5</p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">{review.comment}</p>
                  <p className="mt-3 text-xs text-zinc-500">By {review.user.name}</p>
                </article>
              ))
            )}
          </div>
        </div>
        <ReviewForm productId={product.id} />
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold text-zinc-900">Recommended products</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendations.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
