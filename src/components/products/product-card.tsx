import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { addToCartAction, toggleWishlistAction } from "@/lib/actions";
import { toCurrency } from "@/lib/utils";

type ProductCardProps = {
  product: {
    id: string;
    slug: string;
    title: string;
    brand: string;
    price: unknown;
    compareAtPrice: unknown;
    ratingAvg: number;
    ratingCount: number;
    isDeal: boolean;
    images: { url: string; alt: string | null }[];
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images[0]?.url || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200";
  const numericPrice = Number(product.price);
  const numericCompareAtPrice = Number(product.compareAtPrice);
  const hasDiscount = Number.isFinite(numericCompareAtPrice) && numericCompareAtPrice > numericPrice;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-lg bg-zinc-100">
        <Image src={image} alt={product.images[0]?.alt || product.title} width={900} height={700} className="h-48 w-full object-cover" />
      </Link>
      <div className="mt-3 space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{product.brand}</div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline">
          {product.title}
        </Link>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {product.ratingAvg.toFixed(1)}
          </span>
          <span>({product.ratingCount})</span>
          {product.isDeal && <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">Deal</span>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-zinc-900">{toCurrency(numericPrice)}</span>
          {hasDiscount ? <span className="text-sm text-zinc-500 line-through">{toCurrency(numericCompareAtPrice)}</span> : null}
        </div>

        <div className="flex gap-2 pt-1">
          <form action={addToCartAction} className="flex-1">
            <input type="hidden" name="productId" value={product.id} />
            <button className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700" type="submit">
              Add to cart
            </button>
          </form>
          <form action={toggleWishlistAction}>
            <input type="hidden" name="productId" value={product.id} />
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100" type="submit">
              Wishlist
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
