import Link from "next/link";
import { getOrdersByUser } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { toCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await getOrdersByUser(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black text-zinc-900">My Orders</h1>
      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">{order.orderNumber}</p>
                  <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <StatusPill value={order.status} />
              </div>
              <p className="mt-3 text-sm text-zinc-700">Total: <strong>{toCurrency(String(order.total))}</strong></p>
              <Link href={`/orders/${order.id}`} className="mt-3 inline-flex text-sm font-semibold text-zinc-900 hover:underline">
                View details
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
