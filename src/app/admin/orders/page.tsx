import { updateOrderStatusAction } from "@/lib/actions";
import { getAdminOrders } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { OrderStatus, Role } from "@prisma/client";
import { toCurrency } from "@/lib/utils";

export default async function AdminOrdersPage() {
  await requireRole(Role.ADMIN);
  const orders = await getAdminOrders();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-zinc-900">Order Management</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">{order.orderNumber}</p>
                <p className="text-xs text-zinc-500">{order.user.email}</p>
              </div>
              <div className="text-sm font-semibold text-zinc-900">{toCurrency(String(order.total))}</div>
            </div>
            <form action={updateOrderStatusAction} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="orderId" value={order.id} />
              <select name="status" defaultValue={order.status} className="rounded-md border border-zinc-300 px-3 py-2">
                {Object.values(OrderStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">Update status</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
