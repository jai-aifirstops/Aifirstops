"use server";

import bcrypt from "bcryptjs";
import { DiscountType, InventoryAction, OrderStatus, PaymentStatus, RefundStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { sendOrderStatusNotification } from "@/lib/notifications";
import { requireRole, requireUser } from "@/lib/session";
import { toNumber, toSlug } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/auth/register?error=invalid");
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/auth/register?error=exists");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  redirect("/auth/login?registered=true");
}

export async function addToCartAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const quantity = Math.max(1, toNumber(formData.get("quantity"), 1));

  if (!productId) {
    return;
  }

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId,
        quantity,
      },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/products");
}

export async function updateCartItemQuantityAction(formData: FormData) {
  const user = await requireUser();
  const cartItemId = String(formData.get("cartItemId") ?? "");
  const quantity = Math.max(1, toNumber(formData.get("quantity"), 1));

  await prisma.cartItem.updateMany({
    where: {
      id: cartItemId,
      userId: user.id,
    },
    data: { quantity },
  });

  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const user = await requireUser();
  const cartItemId = String(formData.get("cartItemId") ?? "");

  await prisma.cartItem.deleteMany({
    where: {
      id: cartItemId,
      userId: user.id,
    },
  });

  revalidatePath("/cart");
}

export async function toggleWishlistAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");

  if (!productId) {
    return;
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId,
      },
    });
  }

  revalidatePath("/wishlist");
}

export async function submitReviewAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const rating = Math.max(1, Math.min(5, toNumber(formData.get("rating"), 5)));
  const title = String(formData.get("title") ?? "");
  const comment = String(formData.get("comment") ?? "");

  if (!productId || !title || !comment) {
    return;
  }

  await prisma.review.upsert({
    where: {
      productId_userId: {
        productId,
        userId: user.id,
      },
    },
    update: {
      rating,
      title,
      comment,
      isApproved: true,
    },
    create: {
      productId,
      userId: user.id,
      rating,
      title,
      comment,
      isApproved: true,
    },
  });

  const stats = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: stats._avg.rating ?? 0,
      ratingCount: stats._count._all,
    },
  });

  revalidatePath("/products");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
    },
  });

  revalidatePath("/profile");
}

export async function createSupportTicketAction(formData: FormData) {
  const session = await getServerAuthSession();
  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "");
  const providedEmail = String(formData.get("email") ?? "").trim();

  if (!subject || !message) {
    return;
  }

  const email = session?.user?.email || providedEmail;

  if (!email) {
    return;
  }

  await prisma.supportTicket.create({
    data: {
      subject,
      message,
      email,
      userId: session?.user?.id ?? null,
    },
  });

  revalidatePath("/help");
  redirect("/help?sent=true");
}

// Admin actions

export async function createCategoryAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();

  if (!name) {
    return;
  }

  await prisma.category.create({
    data: {
      name,
      slug: toSlug(name),
      description: description || null,
      image: image || null,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireRole(Role.ADMIN);
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!categoryId) {
    return;
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  revalidatePath("/admin/categories");
}

export async function createProductAction(formData: FormData) {
  const user = await requireUser();

  if (user.role !== Role.ADMIN && user.role !== Role.SELLER) {
    redirect("/");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const price = toNumber(formData.get("price"), 0);
  const compareAtPrice = toNumber(formData.get("compareAtPrice"), 0);
  const inventory = toNumber(formData.get("inventory"), 0);
  const lowStockThreshold = Math.max(1, toNumber(formData.get("lowStockThreshold"), 5));
  const isDeal = String(formData.get("isDeal") ?? "") === "on";

  if (!title || !description || !brand || !categoryId || price <= 0) {
    return;
  }

  let sellerId: string | undefined;
  if (user.role === Role.SELLER && user.sellerId) {
    sellerId = user.sellerId;
  }

  await prisma.product.create({
    data: {
      title,
      slug: `${toSlug(title)}-${Date.now().toString().slice(-5)}`,
      description,
      brand,
      categoryId,
      sellerId,
      price,
      compareAtPrice: compareAtPrice > 0 ? compareAtPrice : null,
      inventory,
      lowStockThreshold,
      isDeal,
      dealEndsAt: isDeal ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) : null,
      images: {
        create: {
          url: imageUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200",
          alt: title,
          isPrimary: true,
        },
      },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");

  if (user.role !== Role.ADMIN && user.role !== Role.SELLER) {
    redirect("/");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const price = toNumber(formData.get("price"), 0);
  const compareAtPrice = toNumber(formData.get("compareAtPrice"), 0);
  const inventory = toNumber(formData.get("inventory"), 0);
  const lowStockThreshold = Math.max(1, toNumber(formData.get("lowStockThreshold"), 5));
  const isDeal = String(formData.get("isDeal") ?? "") === "on";

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return;
  }

  if (user.role === Role.SELLER && user.sellerId !== product.sellerId) {
    redirect("/admin/products");
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      title,
      description,
      brand,
      categoryId,
      price,
      compareAtPrice: compareAtPrice > 0 ? compareAtPrice : null,
      inventory,
      lowStockThreshold,
      isDeal,
      dealEndsAt: isDeal ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) : null,
      images: {
        deleteMany: {},
        create: {
          url: imageUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200",
          alt: title,
          isPrimary: true,
        },
      },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/products/${product.slug}`);
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");

  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    return;
  }

  if (user.role === Role.SELLER && user.sellerId !== product.sellerId) {
    redirect("/admin/products");
  }

  if (user.role !== Role.ADMIN && user.role !== Role.SELLER) {
    redirect("/");
  }

  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function adjustInventoryAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const productId = String(formData.get("productId") ?? "");
  const amount = toNumber(formData.get("amount"), 0);
  const note = String(formData.get("note") ?? "").trim();

  if (!productId || amount === 0) {
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return;
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      inventory: Math.max(0, product.inventory + amount),
    },
  });

  await prisma.inventoryLog.create({
    data: {
      productId,
      quantity: amount,
      action: amount > 0 ? InventoryAction.RESTOCK : InventoryAction.ADJUSTMENT,
      note: note || null,
    },
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("status") ?? "PENDING") as OrderStatus;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      paymentStatus:
        nextStatus === OrderStatus.REFUNDED
          ? PaymentStatus.REFUNDED
          : nextStatus === OrderStatus.DELIVERED
            ? PaymentStatus.PAID
            : undefined,
    },
    include: {
      user: true,
    },
  });

  await sendOrderStatusNotification({
    email: updated.user.email,
    order: updated,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${updated.id}`);
}

export async function requestRefundAction(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
  });

  if (!order || !reason) {
    return;
  }

  await prisma.refundRequest.create({
    data: {
      orderId: order.id,
      reason,
      status: RefundStatus.REQUESTED,
    },
  });

  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/admin/refunds");
}

export async function updateRefundStatusAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const refundId = String(formData.get("refundId") ?? "");
  const status = String(formData.get("status") ?? "REQUESTED") as RefundStatus;

  await prisma.refundRequest.update({
    where: { id: refundId },
    data: { status },
  });

  revalidatePath("/admin/refunds");
}

export async function updateUserRoleAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "CUSTOMER") as Role;

  if (!userId) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
}

export async function setSellerVerificationAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const sellerId = String(formData.get("sellerId") ?? "");
  const verified = String(formData.get("verified") ?? "") === "true";

  if (!sellerId) {
    return;
  }

  await prisma.seller.update({
    where: { id: sellerId },
    data: { verified },
  });

  revalidatePath("/admin/sellers");
}

export async function createCouponAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "PERCENTAGE") as DiscountType;
  const value = toNumber(formData.get("value"), 0);
  const minOrderAmount = toNumber(formData.get("minOrderAmount"), 0);
  const maxDiscount = toNumber(formData.get("maxDiscount"), 0);
  const endsAtRaw = String(formData.get("endsAt") ?? "");

  if (!code || value <= 0 || !endsAtRaw) {
    return;
  }

  await prisma.coupon.create({
    data: {
      code,
      description: description || null,
      type,
      value,
      minOrderAmount: minOrderAmount > 0 ? minOrderAmount : null,
      maxDiscount: maxDiscount > 0 ? maxDiscount : null,
      startsAt: new Date(),
      endsAt: new Date(endsAtRaw),
    },
  });

  revalidatePath("/admin/coupons");
}

export async function toggleCouponStatusAction(formData: FormData) {
  await requireRole(Role.ADMIN);
  const couponId = String(formData.get("couponId") ?? "");

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) {
    return;
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: {
      isActive: !coupon.isActive,
    },
  });

  revalidatePath("/admin/coupons");
}

export async function moderateReviewAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const reviewId = String(formData.get("reviewId") ?? "");
  const approved = String(formData.get("approved") ?? "") === "true";

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { isApproved: approved },
  });

  const stats = await prisma.review.aggregate({
    where: { productId: review.productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: review.productId },
    data: {
      ratingAvg: stats._avg.rating ?? 0,
      ratingCount: stats._count._all,
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/products");
}
