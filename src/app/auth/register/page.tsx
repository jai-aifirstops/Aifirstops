import Link from "next/link";
import { registerAction } from "@/lib/actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-6">
      <h1 className="text-2xl font-black text-zinc-900">Create account</h1>
      {params.error === "exists" ? <p className="mt-2 text-sm text-rose-600">Email already exists.</p> : null}
      {params.error === "invalid" ? <p className="mt-2 text-sm text-rose-600">Please enter valid details.</p> : null}

      <form action={registerAction} className="mt-5 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">Full name</label>
          <input id="name" name="name" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">Password</label>
          <input id="password" name="password" type="password" minLength={8} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700">
          Register
        </button>
      </form>

      <p className="mt-5 text-sm text-zinc-600">
        Already have an account? <Link href="/auth/login" className="font-semibold text-zinc-900 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
