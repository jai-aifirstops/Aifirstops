import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductFilters = {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  brand?: string;
  sort?: "price_asc" | "price_desc" | "newest" | "popularity";
  dealsOnly?: boolean;
};

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });
}

export async function getProducts(filters: ProductFilters = {}) {
  const where: Prisma.ProductWhereInput = {
    isPublished: true,
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query } },
            { description: { contains: filters.query } },
            { brand: { contains: filters.query } },
          ],
        }
      : {}),
    ...(filters.category
      ? {
          category: {
            slug: filters.category,
          },
        }
      : {}),
    ...(filters.brand
      ? {
          brand: { contains: filters.brand },
        }
      : {}),
    ...(filters.minPrice || filters.maxPrice
      ? {
          price: {
            ...(filters.minPrice ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(filters.rating ? { ratingAvg: { gte: filters.rating } } : {}),
    ...(filters.dealsOnly ? { isDeal: true } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { price: "asc" }
      : filters.sort === "price_desc"
        ? { price: "desc" }
        : filters.sort === "popularity"
          ? { ratingCount: "desc" }
          : { createdAt: "desc" };

  return prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: true,
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      seller: true,
    },
  });
}

export async function getFeaturedDeals(limit = 8) {
  return prisma.product.findMany({
    where: {
      isPublished: true,
      isDeal: true,
    },
    take: limit,
    orderBy: [{ dealEndsAt: "asc" }, { createdAt: "desc" }],
    include: {
      category: true,
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      seller: true,
      images: true,
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });
}

export async function getRecommendedProducts(productId: string, categoryId: string) {
  return prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId,
      isPublished: true,
    },
    take: 4,
    orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      category: true,
    },
  });
}

export async function getCartByUser(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });
}

export async function getWishlistByUser(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });
}

export async function getOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
}

export async function getOrderByIdForUser(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
      refunds: true,
      user: {
        select: { email: true, name: true },
      },
    },
  });
}

export async function getAdminDashboardData() {
  const [users, products, orders, lowStockCandidates, refunds, revenue, recentOrders] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.product.findMany({
      orderBy: { inventory: "asc" },
      take: 50,
    }),
    prisma.refundRequest.count({ where: { status: "REQUESTED" } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
      },
    }),
  ]);

  const lowStockProducts = lowStockCandidates
    .filter((product) => product.inventory <= product.lowStockThreshold)
    .slice(0, 8);

  return {
    users,
    products,
    orders,
    pendingRefunds: refunds,
    paidRevenue: Number(revenue._sum.total ?? 0),
    lowStockProducts,
    recentOrders,
  };
}

export async function getSalesChartData() {
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: "PAID",
      createdAt: {
        gte: from,
      },
    },
    select: {
      createdAt: true,
      total: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const buckets = new Map<string, number>();

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(order.total));
  }

  return Array.from(buckets.entries()).map(([day, total]) => ({ day, total }));
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sellerProfile: true,
      _count: {
        select: {
          orders: true,
          reviews: true,
        },
      },
    },
  });
}

export async function getAdminSellers() {
  return prisma.seller.findMany({
    include: {
      user: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminOrders() {
  return prisma.order.findMany({
    include: {
      user: true,
      items: true,
      refunds: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminReviews() {
  return prisma.review.findMany({
    include: {
      user: true,
      product: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInventoryLogs() {
  return prisma.inventoryLog.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getSupportTickets() {
  return prisma.supportTicket.findMany({
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
  });
}

export async function getProductByIdForAdmin(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
}

export async function userHasRole(userId: string, role: Role) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === role;
}
