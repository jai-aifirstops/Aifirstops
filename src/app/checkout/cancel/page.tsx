import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-black text-amber-700">Checkout canceled</h1>
      <p className="mt-3 text-sm text-zinc-600">No payment was captured. Your cart items are still available.</p>
      <Link href="/cart" className="mt-5 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
        Return to cart
      </Link>
    </div>
  );
}
