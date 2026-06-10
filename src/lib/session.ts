import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

export async function requireUser() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return session.user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();

  if (user.role !== role) {
    redirect("/");
  }

  return user;
}
