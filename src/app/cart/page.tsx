import Link from "next/link";
import { getCartByUser } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { toCurrency } from "@/lib/utils";

export default async function CartPage() {
  const user = await requireUser();
  const cartItems = await getCartByUser(user.id);

  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <h1 className="text-3xl font-black text-zinc-900">Shopping Cart</h1>
        {cartItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-600">Your cart is empty.</p>
            <Link href="/products" className="mt-4 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold text-zinc-900">Order Summary</h2>
        <div className="mt-4 space-y-2 text-sm text-zinc-700">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{toCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{subtotal > 100 ? "Free" : "$7.99"}</span>
          </div>
        </div>
        <Link
          href="/checkout"
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
