import "dotenv/config";
import { PrismaClient, Role, DiscountType, OrderStatus, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Electronics", slug: "electronics", description: "Smart devices and accessories", image: "/images/categories/electronics.jpg" },
  { name: "Home & Kitchen", slug: "home-kitchen", description: "Appliances and decor", image: "/images/categories/home.jpg" },
  { name: "Fashion", slug: "fashion", description: "Clothing and lifestyle essentials", image: "/images/categories/fashion.jpg" },
  { name: "Sports", slug: "sports", description: "Fitness and outdoor gear", image: "/images/categories/sports.jpg" },
  { name: "Beauty", slug: "beauty", description: "Self-care and wellness products", image: "/images/categories/beauty.jpg" },
];

async function main() {
  await prisma.refundRequest.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.address.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();

  const [adminHash, sellerHash, customerHash] = await Promise.all([
    bcrypt.hash("Admin123!", 12),
    bcrypt.hash("Seller123!", 12),
    bcrypt.hash("Customer123!", 12),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@marketplace.local",
      passwordHash: adminHash,
      role: Role.ADMIN,
      phone: "+1-555-0100",
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      name: "Nova Seller",
      email: "seller@marketplace.local",
      passwordHash: sellerHash,
      role: Role.SELLER,
      phone: "+1-555-0101",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Test Customer",
      email: "customer@marketplace.local",
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      phone: "+1-555-0102",
      addresses: {
        create: {
          label: "Home",
          fullName: "Test Customer",
          line1: "123 Market Street",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          country: "US",
          phone: "+1-555-0102",
          isDefault: true,
        },
      },
    },
    include: {
      addresses: true,
    },
  });

  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      displayName: "Nova Commerce",
      slug: "nova-commerce",
      bio: "Trusted marketplace seller for premium essentials.",
      verified: true,
    },
  });

  const createdCategories = await Promise.all(
    categories.map((category) => prisma.category.create({ data: category })),
  );

  const productData = [
    {
      title: "Aurora Noise-Cancelling Headphones",
      slug: "aurora-noise-cancelling-headphones",
      description: "Over-ear wireless headphones with adaptive ANC and 40-hour battery.",
      brand: "Aurora",
      price: "129.99",
      compareAtPrice: "179.99",
      inventory: 58,
      categorySlug: "electronics",
      isDeal: true,
      ratingAvg: 4.6,
      ratingCount: 124,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200",
    },
    {
      title: "Pulse Smartwatch Pro",
      slug: "pulse-smartwatch-pro",
      description: "Advanced health tracking smartwatch with AMOLED display.",
      brand: "Pulse",
      price: "219.00",
      compareAtPrice: "249.00",
      inventory: 34,
      categorySlug: "electronics",
      isDeal: false,
      ratingAvg: 4.4,
      ratingCount: 89,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200",
    },
    {
      title: "Glacier Stainless Water Bottle",
      slug: "glacier-stainless-water-bottle",
      description: "Insulated steel bottle keeping drinks cold for 24 hours.",
      brand: "Glacier",
      price: "24.99",
      compareAtPrice: "34.99",
      inventory: 120,
      categorySlug: "sports",
      isDeal: true,
      ratingAvg: 4.8,
      ratingCount: 265,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200",
    },
    {
      title: "Verve Running Shoes",
      slug: "verve-running-shoes",
      description: "Breathable performance shoes designed for daily running.",
      brand: "Verve",
      price: "89.00",
      compareAtPrice: "109.00",
      inventory: 22,
      categorySlug: "fashion",
      isDeal: false,
      ratingAvg: 4.3,
      ratingCount: 77,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200",
    },
    {
      title: "Luma Air Purifier",
      slug: "luma-air-purifier",
      description: "HEPA-powered purifier suitable for medium-sized rooms.",
      brand: "Luma",
      price: "169.50",
      compareAtPrice: "219.50",
      inventory: 14,
      categorySlug: "home-kitchen",
      isDeal: true,
      ratingAvg: 4.5,
      ratingCount: 63,
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200",
    },
    {
      title: "SilkGlow Skincare Set",
      slug: "silkglow-skincare-set",
      description: "Daily skincare routine bundle for hydration and glow.",
      brand: "SilkGlow",
      price: "59.99",
      compareAtPrice: "74.99",
      inventory: 75,
      categorySlug: "beauty",
      isDeal: false,
      ratingAvg: 4.7,
      ratingCount: 142,
      image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200",
    },
  ];

  const createdProducts = [] as { id: string; title: string; slug: string; price: string }[];

  for (const item of productData) {
    const category = createdCategories.find((entry) => entry.slug === item.categorySlug);
    if (!category) {
      continue;
    }

    const product = await prisma.product.create({
      data: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        brand: item.brand,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        inventory: item.inventory,
        categoryId: category.id,
        sellerId: seller.id,
        isDeal: item.isDeal,
        dealEndsAt: item.isDeal ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 5) : null,
        ratingAvg: item.ratingAvg,
        ratingCount: item.ratingCount,
        images: {
          create: {
            url: item.image,
            alt: item.title,
            isPrimary: true,
          },
        },
      },
    });

    createdProducts.push({ id: product.id, title: product.title, slug: product.slug, price: item.price });
  }

  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      description: "10% off for first-time customers",
      type: DiscountType.PERCENTAGE,
      value: "10",
      minOrderAmount: "50",
      maxDiscount: "30",
      startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      usageLimit: 1000,
      isActive: true,
    },
  });

  const firstProduct = createdProducts[0];
  const secondProduct = createdProducts[1];

  if (firstProduct && secondProduct && customer.addresses[0]) {
    const order = await prisma.order.create({
      data: {
        orderNumber: `MKT-${Date.now()}`,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        subtotal: "348.99",
        tax: "27.92",
        shipping: "0",
        discount: "20.00",
        total: "356.91",
        userId: customer.id,
        shippingAddress: customer.addresses[0],
        items: {
          create: [
            {
              productId: firstProduct.id,
              quantity: 1,
              unitPrice: firstProduct.price,
              productName: firstProduct.title,
              productSlug: firstProduct.slug,
            },
            {
              productId: secondProduct.id,
              quantity: 1,
              unitPrice: secondProduct.price,
              productName: secondProduct.title,
              productSlug: secondProduct.slug,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.review.createMany({
      data: [
        {
          productId: firstProduct.id,
          userId: customer.id,
          rating: 5,
          title: "Excellent quality",
          comment: "Comfortable fit and premium audio. Battery life is impressive.",
          isApproved: true,
        },
        {
          productId: secondProduct.id,
          userId: customer.id,
          rating: 4,
          title: "Great for workouts",
          comment: "Tracks health metrics well and syncs quickly.",
          isApproved: true,
        },
      ],
    });

    await prisma.refundRequest.create({
      data: {
        orderId: order.id,
        reason: "Packaging dented on arrival",
      },
    });
  }

  console.log("Seed completed");
  console.log("Admin login: admin@marketplace.local / Admin123!");
  console.log("Seller login: seller@marketplace.local / Seller123!");
  console.log("Customer login: customer@marketplace.local / Customer123!");
  console.log("Default coupon: WELCOME10");
  console.log(`Admin user id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
