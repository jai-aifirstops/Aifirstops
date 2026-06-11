import { createSupportTicketAction } from "@/lib/actions";

export default async function HelpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]" id="contact">
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h1 className="text-3xl font-black text-zinc-900">Help & Contact</h1>
        <p className="text-sm text-zinc-600">
          Need support with orders, returns, seller issues, or account access? Our support structure is ready for email and ticket workflows.
        </p>

        <div className="space-y-3">
          <article className="rounded-lg bg-zinc-100 p-4">
            <h3 className="font-semibold text-zinc-900">Order & delivery support</h3>
            <p className="mt-1 text-sm text-zinc-600">Track shipments, update delivery notes, and report damaged items.</p>
          </article>
          <article className="rounded-lg bg-zinc-100 p-4">
            <h3 className="font-semibold text-zinc-900">Seller and product support</h3>
            <p className="mt-1 text-sm text-zinc-600">Report listing issues, counterfeit concerns, or incorrect product details.</p>
          </article>
          <article className="rounded-lg bg-zinc-100 p-4">
            <h3 className="font-semibold text-zinc-900">Payments and refunds</h3>
            <p className="mt-1 text-sm text-zinc-600">All payments use Stripe test mode. Refund statuses appear on your order detail page.</p>
          </article>
        </div>
      </section>

      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold text-zinc-900">Contact support</h2>
        {params.sent ? <p className="mt-2 text-sm text-emerald-600">Ticket submitted successfully.</p> : null}
        <form action={createSupportTicketAction} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="message">Message</label>
            <textarea id="message" name="message" rows={5} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            Submit ticket
          </button>
        </form>
      </aside>
    </div>
  );
}
