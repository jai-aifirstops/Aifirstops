import Link from "next/link";
import { deleteProductAction } from "@/lib/actions";
import { getProducts } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { toCurrency } from "@/lib/utils";

export default async function AdminProductsPage() {
  await requireRole(Role.ADMIN);
  const products = await getProducts({ sort: "newest" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-zinc-900">Product Management</h1>
        <Link href="/admin/products/new" className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">Add product</Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Inventory</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-zinc-200">
                <td className="px-3 py-2 font-medium text-zinc-900">{product.title}</td>
                <td className="px-3 py-2 text-zinc-700">{product.category.name}</td>
                <td className="px-3 py-2 text-zinc-700">{toCurrency(String(product.price))}</td>
                <td className="px-3 py-2 text-zinc-700">{product.inventory}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/products/${product.id}/edit`} className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100">
                      Edit
                    </Link>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <button type="submit" className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
