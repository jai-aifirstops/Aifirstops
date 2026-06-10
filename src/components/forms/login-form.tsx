"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);

        const result = await signIn("credentials", {
          email: formData.get("email"),
          password: formData.get("password"),
          redirect: false,
          callbackUrl,
        });

        setIsLoading(false);

        if (result?.error) {
          setError("Invalid email or password.");
          return;
        }

        window.location.href = result?.url || callbackUrl;
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input id="email" name="email" type="email" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
          Password
        </label>
        <input id="password" name="password" type="password" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button type="submit" disabled={isLoading} className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-70">
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
