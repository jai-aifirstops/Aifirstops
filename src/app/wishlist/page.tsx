import Link from "next/link";
import { toggleWishlistAction } from "@/lib/actions";
import { getWishlistByUser } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { toCurrency } from "@/lib/utils";

export default async function WishlistPage() {
  const user = await requireUser();
  const wishlist = await getWishlistByUser(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black text-zinc-900">Wishlist</h1>
      {wishlist.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">No saved items yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{item.product.brand}</p>
              <Link href={`/products/${item.product.slug}`} className="mt-1 block font-semibold text-zinc-900 hover:underline">
                {item.product.title}
              </Link>
              <p className="mt-2 text-sm text-zinc-700">{toCurrency(String(item.product.price))}</p>
              <form action={toggleWishlistAction} className="mt-3">
                <input type="hidden" name="productId" value={item.product.id} />
                <button type="submit" className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100">
                  Remove
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
