import Link from "next/link";
import { getAdminDashboardData, getSalesChartData } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { StatCard } from "@/components/admin/stat-card";
import { SalesChart } from "@/components/admin/sales-chart";
import { toCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";

export default async function AdminDashboardPage() {
  await requireRole(Role.ADMIN);

  const [dashboard, chartData] = await Promise.all([getAdminDashboardData(), getSalesChartData()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-zinc-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">Operational overview, alerts, and revenue trends.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Users" value={dashboard.users.toString()} />
        <StatCard label="Products" value={dashboard.products.toString()} />
        <StatCard label="Orders" value={dashboard.orders.toString()} />
        <StatCard label="Revenue" value={toCurrency(dashboard.paidRevenue)} />
        <StatCard label="Refunds Pending" value={dashboard.pendingRefunds.toString()} />
      </section>

      <SalesChart points={chartData} />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-zinc-900">Low-stock alerts</h2>
            <Link href="/admin/inventory" className="text-xs font-semibold text-zinc-700 hover:underline">Manage</Link>
          </div>
          <div className="space-y-2 text-sm">
            {dashboard.lowStockProducts.length === 0 ? <p className="text-zinc-600">No low-stock items.</p> : null}
            {dashboard.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2">
                <span className="font-medium text-zinc-800">{product.title}</span>
                <span className="text-rose-700">{product.inventory} left</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-zinc-900">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-zinc-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2 text-sm">
            {dashboard.recentOrders.map((order) => (
              <div key={order.id} className="rounded-md bg-zinc-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-800">{order.orderNumber}</span>
                  <StatusPill value={order.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-600">{order.user.email}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
