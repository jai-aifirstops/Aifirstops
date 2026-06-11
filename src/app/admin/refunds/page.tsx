import { updateRefundStatusAction } from "@/lib/actions";
import { getAdminOrders } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { RefundStatus, Role } from "@prisma/client";

export default async function AdminRefundsPage() {
  await requireRole(Role.ADMIN);
  const orders = await getAdminOrders();

  const refunds = orders.flatMap((order) =>
    order.refunds.map((refund) => ({
      ...refund,
      orderNumber: order.orderNumber,
      customerEmail: order.user.email,
    })),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-zinc-900">Refund & Status Management</h1>
      <div className="space-y-3">
        {refunds.length === 0 ? <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">No refund requests.</p> : null}
        {refunds.map((refund) => (
          <article key={refund.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">Order {refund.orderNumber}</p>
                <p className="text-xs text-zinc-500">{refund.customerEmail}</p>
              </div>
              <p className="text-xs font-medium text-zinc-600">{refund.status}</p>
            </div>
            <p className="mt-2 text-sm text-zinc-700">{refund.reason}</p>
            <form action={updateRefundStatusAction} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="refundId" value={refund.id} />
              <select name="status" defaultValue={refund.status} className="rounded-md border border-zinc-300 px-3 py-2 text-xs">
                {Object.values(RefundStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700">Save</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
