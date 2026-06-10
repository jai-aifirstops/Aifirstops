import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/refunds", label: "Refunds" },
];

export function AdminSidebar() {
  return (
    <aside className="w-full rounded-xl border border-zinc-200 bg-white p-3 lg:w-64">
      <h2 className="px-2 pb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Admin Panel</h2>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
