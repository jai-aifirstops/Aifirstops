import { createProductAction } from "@/lib/actions";
import { getCategories } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { ImageUploader } from "@/components/admin/image-uploader";

export default async function NewProductPage() {
  await requireRole(Role.ADMIN);
  const categories = await getCategories();

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h1 className="text-2xl font-black text-zinc-900">Create Product</h1>
      <form action={createProductAction} className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Title</label>
          <input name="title" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Description</label>
          <textarea name="description" rows={4} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Brand</label>
          <input name="brand" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Category</label>
          <select name="categoryId" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Price</label>
          <input type="number" name="price" min="0" step="0.01" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Compare-at price</label>
          <input type="number" name="compareAtPrice" min="0" step="0.01" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Inventory</label>
          <input type="number" name="inventory" min="0" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Low-stock threshold</label>
          <input type="number" name="lowStockThreshold" min="1" defaultValue={5} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Image</label>
          <ImageUploader name="imageUrl" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
          <input type="checkbox" name="isDeal" /> Mark as deal
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            Create product
          </button>
        </div>
      </form>
    </div>
  );
}
