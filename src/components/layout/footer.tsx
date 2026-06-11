import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 lg:px-6">
        <div>
          <h3 className="text-base font-bold text-zinc-900">NOVA MARKET</h3>
          <p className="mt-3 text-sm text-zinc-600">
            A modern multi-vendor marketplace for everyday shopping with secure payments and fast fulfillment.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href="/products" className="hover:text-zinc-900">Products</Link></li>
            <li><Link href="/deals" className="hover:text-zinc-900">Deals</Link></li>
            <li><Link href="/wishlist" className="hover:text-zinc-900">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href="/profile" className="hover:text-zinc-900">Profile</Link></li>
            <li><Link href="/orders" className="hover:text-zinc-900">Orders</Link></li>
            <li><Link href="/cart" className="hover:text-zinc-900">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">Support</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href="/help" className="hover:text-zinc-900">Help Center</Link></li>
            <li><Link href="/help#contact" className="hover:text-zinc-900">Contact</Link></li>
            <li><span>support@nova-market.local</span></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
