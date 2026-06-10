import Link from "next/link";
import { ShoppingCart, UserRound, Heart, LayoutDashboard } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/data";
import { SignOutButton } from "@/components/auth/sign-out-button";

export async function Header() {
  const [session, categories] = await Promise.all([getServerAuthSession(), getCategories()]);

  const cartCount = session?.user?.id
    ? await prisma.cartItem.count({
        where: {
          userId: session.user.id,
        },
      })
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
        <Link href="/" className="text-xl font-black tracking-tight text-zinc-900">
          NOVA MARKET
        </Link>

        <form action="/search" className="hidden flex-1 md:flex">
          <input
            type="text"
            name="q"
            placeholder="Search products, brands, categories..."
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/deals" className="rounded-md px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
            Deals
          </Link>
          <Link href="/wishlist" className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="relative rounded-md p-2 text-zinc-700 hover:bg-zinc-100" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-2">
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100" aria-label="Admin">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              )}
              <Link href="/profile" className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100" aria-label="Profile">
                <UserRound className="h-5 w-5" />
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <Link href="/auth/login" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="overflow-x-auto border-t border-zinc-100 bg-zinc-50">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-2 lg:px-6">
          <Link href="/products" className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 hover:bg-zinc-200">
            All Products
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            >
              {category.name}
            </Link>
          ))}
          <Link href="/help" className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
            Help
          </Link>
        </div>
      </div>
    </header>
  );
}
