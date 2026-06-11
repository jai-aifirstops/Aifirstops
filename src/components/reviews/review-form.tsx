import { submitReviewAction } from "@/lib/actions";

type ReviewFormProps = {
  productId: string;
};

export function ReviewForm({ productId }: ReviewFormProps) {
  return (
    <form action={submitReviewAction} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <input type="hidden" name="productId" value={productId} />
      <h3 className="text-sm font-semibold text-zinc-900">Write a review</h3>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="rating">
          Rating (1-5)
        </label>
        <input
          id="rating"
          name="rating"
          type="number"
          min={1}
          max={5}
          defaultValue={5}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="title">
          Title
        </label>
        <input id="title" name="title" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="comment">
          Review
        </label>
        <textarea id="comment" name="comment" rows={4} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" required />
      </div>
      <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700" type="submit">
        Submit review
      </button>
    </form>
  );
}
