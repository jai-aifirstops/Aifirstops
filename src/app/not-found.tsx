import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-black text-zinc-900">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-600">The page you requested does not exist or may have moved.</p>
      <Link href="/" className="mt-5 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
        Go to homepage
      </Link>
    </div>
  );
}
