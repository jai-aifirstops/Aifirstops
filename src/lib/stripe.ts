import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY is missing. Stripe checkout will fail until configured.");
}

export const stripe = new Stripe(stripeSecretKey || "sk_test_placeholder", {
  apiVersion: "2026-05-27.dahlia",
  appInfo: {
    name: "Modern Marketplace",
    version: "1.0.0",
  },
});
