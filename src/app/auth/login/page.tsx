import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-6">
      <h1 className="text-2xl font-black text-zinc-900">Sign in</h1>
      {params.registered ? <p className="mt-2 text-sm text-emerald-600">Account created. You can sign in now.</p> : null}
      <div className="mt-5">
        <LoginForm />
      </div>
      <p className="mt-5 text-sm text-zinc-600">
        New customer? <Link href="/auth/register" className="font-semibold text-zinc-900 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
