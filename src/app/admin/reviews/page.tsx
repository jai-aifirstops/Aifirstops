import { moderateReviewAction } from "@/lib/actions";
import { getAdminReviews } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";

export default async function AdminReviewsPage() {
  await requireRole(Role.ADMIN);
  const reviews = await getAdminReviews();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-zinc-900">Review Moderation</h1>
      <div className="space-y-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-zinc-900">{review.product.title}</p>
              <span className="text-xs font-medium text-zinc-600">{review.rating}/5</span>
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-800">{review.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{review.comment}</p>
            <p className="mt-2 text-xs text-zinc-500">By {review.user.email}</p>
            <form action={moderateReviewAction} className="mt-3 flex gap-2">
              <input type="hidden" name="reviewId" value={review.id} />
              <button type="submit" name="approved" value="true" className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                Approve
              </button>
              <button type="submit" name="approved" value="false" className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                Hide
              </button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
