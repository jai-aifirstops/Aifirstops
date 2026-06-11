"use client";

import { useState } from "react";

export function CheckoutButton({ couponCode }: { couponCode?: string }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          const response = await fetch("/api/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ couponCode }),
          });

          const payload = (await response.json()) as { checkoutUrl?: string; error?: string };

          if (!response.ok || !payload.checkoutUrl) {
            throw new Error(payload.error || "Unable to start checkout.");
          }
          window.location.href = payload.checkoutUrl;
        } catch (error) {
          alert(error instanceof Error ? error.message : "Checkout failed");
        } finally {
          setIsLoading(false);
        }
      }}
      className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-70"
    >
      {isLoading ? "Redirecting..." : "Continue to Stripe Checkout"}
    </button>
  );
}
