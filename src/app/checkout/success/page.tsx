import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-emerald-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-black text-emerald-700">Payment successful</h1>
      <p className="mt-3 text-sm text-zinc-600">Your order was created and is now being processed.</p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/orders" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          View orders
        </Link>
        <Link href="/products" className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
