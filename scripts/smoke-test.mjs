import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";

let SMOKE_PORT = Number(process.env.SMOKE_PORT || "0");
let BASE_URL = "http://localhost:3100";
let DEFAULT_ENV = { ...process.env };

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function logStep(message) {
  process.stdout.write(`\n[smoke] ${message}\n`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: DEFAULT_ENV,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed (${command} ${args.join(" ")}), exit code: ${code}`));
      }
    });
  });
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine free TCP port"));
        return;
      }

      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServerReady(serverProcess, path = "/auth/login", timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (serverProcess?.exitCode !== null) {
      throw new Error(`Server exited before ready (exit code: ${serverProcess.exitCode})`);
    }

    try {
      const response = await fetch(`${BASE_URL}${path}`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // Ignore until timeout.
    }

    await sleep(1_000);
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  addFromResponse(response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];

    for (const rawCookie of setCookies) {
      const [pair] = rawCookie.split(";");
      const [name, ...rest] = pair.split("=");

      if (!name || rest.length === 0) {
        continue;
      }

      this.cookies.set(name.trim(), rest.join("=").trim());
    }
  }

  toHeaderValue() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

async function httpRequest(path, { method = "GET", headers = {}, body, jar, expectStatus } = {}) {
  const requestHeaders = { ...headers };

  if (jar) {
    const cookieHeader = jar.toHeaderValue();
    if (cookieHeader) {
      requestHeaders.Cookie = cookieHeader;
    }
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body,
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(`${method} ${path} failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (jar) {
    jar.addFromResponse(response);
  }

  if (expectStatus !== undefined) {
    assert(response.status === expectStatus, `${method} ${path} expected ${expectStatus}, got ${response.status}`);
  }

  return response;
}

async function parseJson(response, context) {
  try {
    return await response.json();
  } catch {
    throw new Error(`Expected JSON response for ${context}`);
  }
}

async function loginViaCredentials(email, password, callbackPath) {
  const jar = new CookieJar();

  const csrfResponse = await httpRequest("/api/auth/csrf", { jar, expectStatus: 200 });
  const csrfPayload = await parseJson(csrfResponse, "/api/auth/csrf");
  assert(typeof csrfPayload.csrfToken === "string" && csrfPayload.csrfToken.length > 0, "Missing csrfToken");

  const form = new URLSearchParams({
    csrfToken: csrfPayload.csrfToken,
    email,
    password,
    callbackUrl: `${BASE_URL}${callbackPath}`,
    json: "true",
  });

  const loginResponse = await httpRequest("/api/auth/callback/credentials", {
    method: "POST",
    jar,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    expectStatus: 200,
  });

  const loginPayload = await parseJson(loginResponse, "/api/auth/callback/credentials");
  assert(typeof loginPayload.url === "string", `Invalid login response for ${email}`);

  return { jar, redirectUrl: loginPayload.url };
}

async function verifyRoutes(routes, jar) {
  for (const route of routes) {
    await httpRequest(route, { jar, expectStatus: 200 });
  }
}

async function expectPageContains(path, needle, jar) {
  const response = await httpRequest(path, { jar, expectStatus: 200 });
  const html = await response.text();
  assert(html.includes(needle), `Expected "${needle}" on ${path}`);
}

function startServer() {
  const child = spawn("npx", ["next", "start", "-p", String(SMOKE_PORT)], {
    env: DEFAULT_ENV,
    shell: false,
    stdio: "ignore",
  });

  return child;
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.on("exit", resolve)), sleep(8_000)]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([new Promise((resolve) => child.on("exit", resolve)), sleep(3_000)]);
  }
}

async function run() {
  let serverProcess;

  try {
    SMOKE_PORT = SMOKE_PORT || (await getAvailablePort());
    BASE_URL = `http://localhost:${SMOKE_PORT}`;
    DEFAULT_ENV = {
      ...process.env,
      DATABASE_URL: "file:./dev.db",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-local-secret",
      NEXTAUTH_URL: BASE_URL,
      PORT: String(SMOKE_PORT),
    };

    process.env.DATABASE_URL = DEFAULT_ENV.DATABASE_URL;
    process.env.NEXTAUTH_SECRET = DEFAULT_ENV.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_URL = DEFAULT_ENV.NEXTAUTH_URL;
    process.env.PORT = DEFAULT_ENV.PORT;

    logStep(`Using smoke test URL ${BASE_URL}`);
    logStep("Preparing DB and running build checks");
    await runCommand("npm", ["run", "db:up"]);
    await runCommand("npm", ["run", "db:generate"]);
    await runCommand("npm", ["run", "db:push"]);
    await runCommand("npm", ["run", "db:seed"]);
    await runCommand("npm", ["run", "typecheck"]);
    await runCommand("npm", ["run", "lint"]);
    await runCommand("npm", ["run", "build"]);

    logStep("Starting app server");
    serverProcess = startServer();
    await waitForServerReady(serverProcess);

    logStep("Verifying seeded data");
    const prisma = new PrismaClient();
    const [admin, seller, customer, auroraProduct] = await Promise.all([
      prisma.user.findUnique({ where: { email: "admin@marketplace.local" } }),
      prisma.user.findUnique({ where: { email: "seller@marketplace.local" } }),
      prisma.user.findUnique({ where: { email: "customer@marketplace.local" } }),
      prisma.product.findUnique({ where: { slug: "aurora-noise-cancelling-headphones" } }),
    ]);

    assert(admin && seller && customer, "Expected seeded admin/seller/customer users");
    assert(auroraProduct, "Expected seeded product slug aurora-noise-cancelling-headphones");

    const seededOrder = await prisma.order.findFirst({
      where: { userId: customer.id },
      orderBy: { createdAt: "desc" },
    });
    assert(seededOrder, "Expected seeded customer order");

    await prisma.cartItem.upsert({
      where: { userId_productId: { userId: customer.id, productId: auroraProduct.id } },
      update: { quantity: 2 },
      create: { userId: customer.id, productId: auroraProduct.id, quantity: 2 },
    });

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: customer.id, productId: auroraProduct.id } },
      update: {},
      create: { userId: customer.id, productId: auroraProduct.id },
    });

    await prisma.$disconnect();

    logStep("Verifying auth logins and role-based access");
    const adminLogin = await loginViaCredentials("admin@marketplace.local", "Admin123!", "/admin");
    const sellerLogin = await loginViaCredentials("seller@marketplace.local", "Seller123!", "/profile");
    const customerLogin = await loginViaCredentials("customer@marketplace.local", "Customer123!", "/profile");

    assert(adminLogin.redirectUrl.endsWith("/admin"), "Admin login redirect mismatch");
    assert(sellerLogin.redirectUrl.endsWith("/profile"), "Seller login redirect mismatch");
    assert(customerLogin.redirectUrl.endsWith("/profile"), "Customer login redirect mismatch");

    await httpRequest("/admin", { expectStatus: 307 });
    await httpRequest("/admin", { jar: customerLogin.jar, expectStatus: 307 });
    await httpRequest("/admin", { jar: sellerLogin.jar, expectStatus: 307 });
    await httpRequest("/admin", { jar: adminLogin.jar, expectStatus: 200 });

    logStep("Verifying public customer pages");
    await verifyRoutes(
      [
        "/",
        "/products",
        "/search?q=aurora",
        "/category/electronics",
        "/products/aurora-noise-cancelling-headphones",
        "/deals",
        "/help",
        "/auth/login",
        "/auth/register",
        "/checkout/success",
        "/checkout/cancel",
      ],
      undefined,
    );

    logStep("Verifying authenticated customer pages");
    await verifyRoutes(
      [
        "/cart",
        "/checkout",
        "/profile",
        "/orders",
        `/orders/${seededOrder.id}`,
        "/wishlist",
      ],
      customerLogin.jar,
    );

    await expectPageContains("/products?category=electronics&min=10&max=500&rating=4&sort=price_desc", "products found");
    await expectPageContains("/search?q=aurora", "Search Results");
    await expectPageContains("/products/aurora-noise-cancelling-headphones", "Recommended products");
    await expectPageContains("/products/aurora-noise-cancelling-headphones", "Excellent quality");
    await expectPageContains("/cart", "Aurora Noise-Cancelling Headphones", customerLogin.jar);
    await expectPageContains("/wishlist", "Aurora Noise-Cancelling Headphones", customerLogin.jar);
    await expectPageContains("/orders", "My Orders", customerLogin.jar);
    await expectPageContains(`/orders/${seededOrder.id}`, "Refund requests", customerLogin.jar);

    logStep("Verifying admin pages");
    await verifyRoutes(
      [
        "/admin",
        "/admin/products",
        "/admin/products/new",
        `/admin/products/${auroraProduct.id}/edit`,
        "/admin/categories",
        "/admin/inventory",
        "/admin/orders",
        "/admin/users",
        "/admin/sellers",
        "/admin/coupons",
        "/admin/reviews",
        "/admin/analytics",
        "/admin/refunds",
      ],
      adminLogin.jar,
    );

    await expectPageContains("/admin", "Low-stock alerts", adminLogin.jar);
    await expectPageContains("/admin", "Recent orders", adminLogin.jar);
    await expectPageContains("/admin/analytics", "Sales Analytics", adminLogin.jar);

    logStep("Verifying support and upload APIs");
    const supportResponse = await httpRequest("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Smoke test",
        message: "Validating support API in smoke test",
        email: "customer@marketplace.local",
      }),
      expectStatus: 200,
    });

    const supportPayload = await parseJson(supportResponse, "/api/support");
    assert(typeof supportPayload.id === "string" && supportPayload.id.length > 0, "Support API did not return ticket id");

    const fileBuffer = await readFile(new URL("../public/next.svg", import.meta.url));
    const uploadFormData = new FormData();
    uploadFormData.append("file", new Blob([fileBuffer], { type: "image/svg+xml" }), "next.svg");

    const uploadResponse = await httpRequest("/api/upload", {
      method: "POST",
      body: uploadFormData,
      expectStatus: 200,
    });
    const uploadPayload = await parseJson(uploadResponse, "/api/upload");
    assert(
      typeof uploadPayload.url === "string" && uploadPayload.url.startsWith("/uploads/"),
      "Upload API did not return expected uploads path",
    );

    logStep("Smoke test completed successfully");
    process.stdout.write("\n✅ All smoke checks passed.\n");
  } finally {
    await stopServer(serverProcess);
  }
}

run().catch((error) => {
  process.stderr.write(`\n❌ Smoke test failed: ${error.message}\n`);
  process.exit(1);
});
