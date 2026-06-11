import { Role } from "@prisma/client";

export const roleLabel: Record<Role, string> = {
  CUSTOMER: "Customer",
  SELLER: "Seller",
  ADMIN: "Admin",
};

export function isAdmin(role?: Role | null) {
  return role === Role.ADMIN;
}

export function isSeller(role?: Role | null) {
  return role === Role.SELLER;
}

export function canManageCatalog(role?: Role | null) {
  return role === Role.ADMIN || role === Role.SELLER;
}
