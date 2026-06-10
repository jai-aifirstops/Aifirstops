import { DEFAULT_SHIPPING, FREE_SHIPPING_THRESHOLD, TAX_RATE } from "@/lib/constants";
import { getCartByUser } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { toCurrency } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout/checkout-button";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const couponCode = typeof params.coupon === "string" ? params.coupon : undefined;
  const user = await requireUser();
  const items = await getCartByUser(user.id);

  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h1 className="text-2xl font-black text-zinc-900">Checkout</h1>
        <p className="text-sm text-zinc-600">Payments are processed securely in Stripe test mode.</p>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{item.product.title}</p>
                <p className="text-xs text-zinc-600">Qty {item.quantity}</p>
              </div>
              <p className="font-semibold text-zinc-900">{toCurrency(Number(item.product.price) * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700">
          <p className="font-semibold text-zinc-900">Shipping information</p>
          <p className="mt-1">A default shipping address from your profile/account is used in this demo flow.</p>
        </div>
      </section>

      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold text-zinc-900">Payment summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{toCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{toCurrency(shipping)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{toCurrency(tax)}</span></div>
          <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-base font-bold"><span>Total</span><span>{toCurrency(total)}</span></div>
        </div>

        <div className="mt-5 space-y-2">
          <form action="/checkout">
            <input
              name="coupon"
              defaultValue={couponCode}
              placeholder="Coupon code"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
              Apply coupon
            </button>
          </form>
          <CheckoutButton couponCode={couponCode} />
        </div>
      </aside>
    </div>
  );
}
