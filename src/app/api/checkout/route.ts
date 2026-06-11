import { NextResponse } from "next/server";
import { DiscountType, OrderStatus, PaymentStatus } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { DEFAULT_SHIPPING, FREE_SHIPPING_THRESHOLD, TAX_RATE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { couponCode } = (await request.json().catch(() => ({ couponCode: undefined }))) as {
      couponCode?: string;
    };

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        addresses: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const shippingAddress = user.addresses[0];

    if (!shippingAddress) {
      return NextResponse.json({ error: "Please add a shipping address in your profile." }, { status: 400 });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING;

    let discount = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
      });

      if (coupon) {
        const baseDiscount =
          coupon.type === DiscountType.PERCENTAGE
            ? subtotal * (Number(coupon.value) / 100)
            : Number(coupon.value);

        discount = Math.min(baseDiscount, coupon.maxDiscount ? Number(coupon.maxDiscount) : Number.POSITIVE_INFINITY);
        couponId = coupon.id;
      }
    }

    const total = Math.max(0, subtotal + tax + shipping - discount);

    const order = await prisma.order.create({
      data: {
        orderNumber: `MKT-${Date.now()}`,
        userId: user.id,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        couponId,
        shippingAddress,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price,
            productName: item.product.title,
            productSlug: item.product.slug,
          })),
        },
      },
    });

    const stripeCoupon =
      discount > 0
        ? await stripe.coupons.create({
            duration: "once",
            amount_off: Math.round(discount * 100),
            currency: "usd",
            name: couponCode ? `Coupon ${couponCode.toUpperCase()}` : "Order discount",
          })
        : null;

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/checkout/cancel`,
      customer_email: user.email,
      metadata: {
        orderId: order.id,
        userId: user.id,
      },
      ...(stripeCoupon ? { discounts: [{ coupon: stripeCoupon.id }] } : {}),
      line_items: [
        ...cartItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.title,
              description: item.product.brand,
            },
            unit_amount: Math.round(Number(item.product.price) * 100),
          },
        })),
        ...(shipping > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Shipping",
                    description: "Standard shipping",
                  },
                  unit_amount: Math.round(shipping * 100),
                },
              },
            ]
          : []),
        ...(tax > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Tax",
                    description: "Sales tax",
                  },
                  unit_amount: Math.round(tax * 100),
                },
              },
            ]
          : []),
      ],
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: stripeSession.id,
      },
    });

    return NextResponse.json({ checkoutUrl: stripeSession.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
