import { notFound } from "next/navigation";
import { updateProductAction } from "@/lib/actions";
import { getCategories, getProductByIdForAdmin } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { ImageUploader } from "@/components/admin/image-uploader";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  await requireRole(Role.ADMIN);
  const { id } = await params;
  const [categories, product] = await Promise.all([getCategories(), getProductByIdForAdmin(id)]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h1 className="text-2xl font-black text-zinc-900">Edit Product</h1>
      <form action={updateProductAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="productId" value={product.id} />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Title</label>
          <input name="title" defaultValue={product.title} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Description</label>
          <textarea name="description" rows={4} defaultValue={product.description} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Brand</label>
          <input name="brand" defaultValue={product.brand} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Category</label>
          <select name="categoryId" defaultValue={product.categoryId} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Price</label>
          <input type="number" name="price" min="0" step="0.01" defaultValue={String(product.price)} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Compare-at price</label>
          <input type="number" name="compareAtPrice" min="0" step="0.01" defaultValue={product.compareAtPrice ? String(product.compareAtPrice) : ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Inventory</label>
          <input type="number" name="inventory" min="0" defaultValue={product.inventory} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Low-stock threshold</label>
          <input type="number" name="lowStockThreshold" min="1" defaultValue={product.lowStockThreshold} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Image</label>
          <ImageUploader name="imageUrl" defaultValue={product.images[0]?.url} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
          <input type="checkbox" name="isDeal" defaultChecked={product.isDeal} /> Mark as deal
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
