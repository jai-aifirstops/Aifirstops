import { updateUserRoleAction } from "@/lib/actions";
import { getAdminUsers } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";

export default async function AdminUsersPage() {
  await requireRole(Role.ADMIN);
  const users = await getAdminUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-zinc-900">User Management</h1>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Orders</th>
              <th className="px-3 py-2">Reviews</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-zinc-200">
                <td className="px-3 py-2">
                  <p className="font-medium text-zinc-900">{user.name}</p>
                  <p className="text-xs text-zinc-600">{user.email}</p>
                </td>
                <td className="px-3 py-2">{user.role}</td>
                <td className="px-3 py-2">{user._count.orders}</td>
                <td className="px-3 py-2">{user._count.reviews}</td>
                <td className="px-3 py-2">
                  <form action={updateUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="role" defaultValue={user.role} className="rounded-md border border-zinc-300 px-2 py-1 text-xs">
                      {Object.values(Role).map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
