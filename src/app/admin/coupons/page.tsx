import { createCouponAction, toggleCouponStatusAction } from "@/lib/actions";
import { getAdminCoupons } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { DiscountType, Role } from "@prisma/client";

export default async function AdminCouponsPage() {
  await requireRole(Role.ADMIN);
  const coupons = await getAdminCoupons();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Coupons & Discounts</h1>
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Create coupon</h2>
        <form action={createCouponAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input name="code" placeholder="Code (e.g. SUMMER15)" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" required />
          <select name="type" className="rounded-md border border-zinc-300 px-3 py-2 text-sm">
            {Object.values(DiscountType).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input name="value" type="number" min={0} step="0.01" placeholder="Value" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" required />
          <input name="minOrderAmount" type="number" min={0} step="0.01" placeholder="Min order" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <input name="maxDiscount" type="number" min={0} step="0.01" placeholder="Max discount" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <input name="endsAt" type="datetime-local" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" required />
          <textarea name="description" placeholder="Description" className="rounded-md border border-zinc-300 px-3 py-2 text-sm md:col-span-3" />
          <button type="submit" className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white md:col-span-3">
            Create coupon
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Existing coupons</h2>
        <div className="mt-3 space-y-2 text-sm">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-100 px-3 py-2">
              <div>
                <p className="font-semibold text-zinc-900">{coupon.code}</p>
                <p className="text-xs text-zinc-600">{coupon.type} {String(coupon.value)} · Used {coupon.usedCount}</p>
              </div>
              <form action={toggleCouponStatusAction}>
                <input type="hidden" name="couponId" value={coupon.id} />
                <button type="submit" className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
                  {coupon.isActive ? "Disable" : "Enable"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
