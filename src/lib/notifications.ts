import { Order } from "@prisma/client";

export type NotificationPayload = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Email-ready abstraction. Swap implementation with provider SDK (Resend/SES/Postmark).
 */
export async function queueNotification(payload: NotificationPayload) {
  console.info("[notification:queued]", payload.subject, payload.to);
}

export async function sendOrderStatusNotification(input: {
  email: string;
  order: Pick<Order, "orderNumber" | "status">;
}) {
  const subject = `Order ${input.order.orderNumber} is now ${input.order.status}`;

  await queueNotification({
    to: input.email,
    subject,
    html: `<p>Your order <strong>${input.order.orderNumber}</strong> is now <strong>${input.order.status}</strong>.</p>`,
  });
}
