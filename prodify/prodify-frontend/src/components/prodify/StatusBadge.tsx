import { OrderStatus, SubTaskStatus } from "@/types";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Waiting: "bg-muted text-muted-foreground",
  "On Progress": "bg-primary/20 text-secondary border border-primary/40",
  Assembling: "bg-warning/20 text-warning-foreground border border-warning/50",
  "Ready to Ship": "bg-secondary text-secondary-foreground",
  Done: "bg-success/15 text-success border border-success/30",
  Selesai: "bg-success/15 text-success border border-success/30",
};

export const StatusBadge = ({ status }: { status: OrderStatus | SubTaskStatus }) => (
  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap", map[status])}>
    {status}
  </span>
);