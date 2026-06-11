export const TAX_RATE = 0.08;
export const DEFAULT_SHIPPING = 7.99;
export const FREE_SHIPPING_THRESHOLD = 100;
export const LOW_STOCK_DEFAULT = 5;

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-zinc-200 text-zinc-800",
};
