import { adjustInventoryAction } from "@/lib/actions";
import { getInventoryLogs, getProducts } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";

export default async function AdminInventoryPage() {
  await requireRole(Role.ADMIN);
  const [products, logs] = await Promise.all([getProducts({ sort: "newest" }), getInventoryLogs()]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Inventory Management</h1>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Adjust inventory</h2>
        <form action={adjustInventoryAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <select name="productId" className="rounded-md border border-zinc-300 px-3 py-2 text-sm md:col-span-2">
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.title} ({product.inventory})</option>
            ))}
          </select>
          <input name="amount" type="number" placeholder="+/- quantity" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <input name="note" placeholder="Reason / note" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <button type="submit" className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white md:col-span-4">
            Update stock
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Recent inventory logs</h2>
        <div className="mt-3 space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md bg-zinc-100 px-3 py-2 text-sm">
              <p className="font-medium text-zinc-800">{log.product.title}</p>
              <p className="text-xs text-zinc-600">
                {log.action} {log.quantity > 0 ? `+${log.quantity}` : log.quantity} · {new Date(log.createdAt).toLocaleString()} · {log.note || "No note"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
