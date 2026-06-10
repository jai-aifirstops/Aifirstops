import Image from "next/image";
import Link from "next/link";
import { removeCartItemAction, updateCartItemQuantityAction } from "@/lib/actions";
import { toCurrency } from "@/lib/utils";

type CartItemRowProps = {
  item: {
    id: string;
    quantity: number;
    product: {
      id: string;
      slug: string;
      title: string;
      price: unknown;
      inventory: number;
      images: { url: string; alt: string | null }[];
    };
  };
};

export function CartItemRow({ item }: CartItemRowProps) {
  const image = item.product.images[0]?.url || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200";

  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-[90px_1fr_auto] md:items-center">
      <Image src={image} alt={item.product.images[0]?.alt || item.product.title} width={90} height={90} className="h-[90px] w-[90px] rounded-md object-cover" />
      <div>
        <Link href={`/products/${item.product.slug}`} className="font-semibold text-zinc-900 hover:underline">
          {item.product.title}
        </Link>
        <p className="mt-1 text-sm text-zinc-600">{toCurrency(String(item.product.price))}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <form action={updateCartItemQuantityAction} className="flex items-center gap-2">
          <input type="hidden" name="cartItemId" value={item.id} />
          <input
            type="number"
            name="quantity"
            min={1}
            max={item.product.inventory}
            defaultValue={item.quantity}
            className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-100">
            Update
          </button>
        </form>
        <form action={removeCartItemAction}>
          <input type="hidden" name="cartItemId" value={item.id} />
          <button type="submit" className="rounded-md bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
