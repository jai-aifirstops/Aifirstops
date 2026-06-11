import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const userId = session.metadata?.userId;

      if (orderId) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.PROCESSING,
              paymentStatus: PaymentStatus.PAID,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
            },
          });

          if (userId) {
            await tx.cartItem.deleteMany({
              where: { userId },
            });
          }

          const orderItems = await tx.orderItem.findMany({ where: { orderId } });

          for (const item of orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                inventory: {
                  decrement: item.quantity,
                },
              },
            });
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }
}
