import { notFound } from "next/navigation";
import { requestRefundAction } from "@/lib/actions";
import { getOrderByIdForUser } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { toCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderByIdForUser(id, user.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-zinc-200 bg-white p-5">
        <h1 className="text-2xl font-black text-zinc-900">Order {order.orderNumber}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-600">
          <StatusPill value={order.status} />
          <span>Payment: {order.paymentStatus}</span>
          <span>{new Date(order.createdAt).toLocaleString()}</span>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold text-zinc-900">Items</h2>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 text-sm">
              <p className="font-medium text-zinc-900">{item.productName} × {item.quantity}</p>
              <p className="font-semibold text-zinc-900">{toCurrency(Number(item.unitPrice) * item.quantity)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-zinc-700">Total paid: <strong>{toCurrency(String(order.total))}</strong></p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold text-zinc-900">Refund requests</h2>
        <div className="mt-3 space-y-2">
          {order.refunds.length === 0 ? <p className="text-sm text-zinc-600">No refund requests yet.</p> : null}
          {order.refunds.map((refund) => (
            <p key={refund.id} className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
              {refund.reason} — <strong>{refund.status}</strong>
            </p>
          ))}
        </div>

        <form action={requestRefundAction} className="mt-4 space-y-2">
          <input type="hidden" name="orderId" value={order.id} />
          <textarea name="reason" rows={3} placeholder="Reason for refund request" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Request refund
          </button>
        </form>
      </section>
    </div>
  );
}
