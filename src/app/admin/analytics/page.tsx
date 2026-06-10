import { getAdminDashboardData, getSalesChartData, getSupportTickets } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { SalesChart } from "@/components/admin/sales-chart";
import { toCurrency } from "@/lib/utils";

export default async function AdminAnalyticsPage() {
  await requireRole(Role.ADMIN);

  const [dashboard, sales, tickets] = await Promise.all([
    getAdminDashboardData(),
    getSalesChartData(),
    getSupportTickets(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Sales Analytics</h1>
      <SalesChart points={sales} />
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Gross Revenue</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{toCurrency(dashboard.paidRevenue)}</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total Orders</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{dashboard.orders}</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Support Tickets</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{tickets.length}</p>
        </article>
      </section>
    </div>
  );
}
