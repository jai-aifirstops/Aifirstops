import { createCategoryAction, deleteCategoryAction } from "@/lib/actions";
import { getCategories } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";

export default async function AdminCategoriesPage() {
  await requireRole(Role.ADMIN);
  const categories = await getCategories();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Category Management</h1>
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Create category</h2>
        <form action={createCategoryAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Name" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <input name="image" placeholder="Image URL" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <textarea name="description" placeholder="Description" className="rounded-md border border-zinc-300 px-3 py-2 text-sm md:col-span-2" />
          <button className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Add category
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Existing categories</h2>
        <div className="mt-3 space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{category.name}</p>
                <p className="text-xs text-zinc-600">{category._count.products} products</p>
              </div>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="categoryId" value={category.id} />
                <button type="submit" className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
