import { prisma } from "@/lib/prisma";
import { updateProfileAction } from "@/lib/actions";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      addresses: true,
      sellerProfile: true,
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-zinc-900">My Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage your account details and default address.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-bold text-zinc-900">Account details</h2>
          <form action={updateProfileAction} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={user.name} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="email">Email</label>
              <input id="email" value={user.email} disabled className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" defaultValue={user.phone ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">Save profile</button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-bold text-zinc-900">Role & address</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-700">
            <p><span className="font-semibold">Role:</span> {user.role}</p>
            <p><span className="font-semibold">Seller profile:</span> {user.sellerProfile ? user.sellerProfile.displayName : "Not a seller"}</p>
            <div className="rounded-md bg-zinc-100 p-3">
              <p className="font-semibold text-zinc-900">Default shipping address</p>
              {user.addresses[0] ? (
                <p className="mt-1 text-sm text-zinc-600">
                  {user.addresses[0].line1}, {user.addresses[0].city}, {user.addresses[0].state} {user.addresses[0].postalCode}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">No saved address yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
