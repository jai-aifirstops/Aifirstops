import { ORDER_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusPill({ value }: { value: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", ORDER_STATUS_COLORS[value] ?? "bg-zinc-100 text-zinc-700")}>
      {value}
    </span>
  );
}
