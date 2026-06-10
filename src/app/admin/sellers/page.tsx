import { setSellerVerificationAction } from "@/lib/actions";
import { getAdminSellers } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";

export default async function AdminSellersPage() {
  await requireRole(Role.ADMIN);
  const sellers = await getAdminSellers();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-zinc-900">Seller Management</h1>
      <div className="space-y-2">
        {sellers.map((seller) => (
          <article key={seller.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">{seller.displayName}</p>
                <p className="text-xs text-zinc-600">{seller.user.email} · {seller._count.products} products</p>
              </div>
              <form action={setSellerVerificationAction} className="flex items-center gap-2">
                <input type="hidden" name="sellerId" value={seller.id} />
                <input type="hidden" name="verified" value={String(!seller.verified)} />
                <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100">
                  {seller.verified ? "Mark Unverified" : "Verify Seller"}
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
