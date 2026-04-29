import { Order } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { daysUntil } from "@/store/useStore";
import { Calendar, Zap, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  order: Order;
  onClick?: () => void;
  compact?: boolean;
}

export const OrderCard = ({ order, onClick, compact }: Props) => {
  const days = daysUntil(order.deadline);
  const isUrgent = days <= 5 && order.status !== "Done" && order.status !== "Ready to Ship";
  const urgentClass = isUrgent
    ? order.fastTrack
      ? "border-l-4 border-l-destructive bg-destructive/5"
      : "border-l-4 border-l-warning bg-warning/5"
    : "border-l-4 border-l-transparent";
  const totalSubtasks = order.subtasks.length;
  const doneSubtasks = order.subtasks.filter((s) => s.status === "Selesai").length;
  const progress = totalSubtasks ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer hover:shadow-[var(--shadow-card)] transition-all",
        urgentClass
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-xs font-semibold text-secondary">{order.code}</p>
            {order.fastTrack && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase">
                <Zap className="h-3 w-3" /> Fast Track
              </span>
            )}
            {order.type === "ready_stock" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium">
                Ready Stock
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground mt-1 truncate">{order.productName}</h3>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{order.customerName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span>{order.quantity} pcs</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className={cn(isUrgent && "font-semibold", isUrgent && order.fastTrack ? "text-destructive" : isUrgent ? "text-warning" : "")}>
              Deadline: {new Date(order.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              {order.status !== "Done" && (
                <span className="ml-1">({days >= 0 ? `H-${days}` : `Telat ${Math.abs(days)} hari`})</span>
              )}
            </span>
          </div>
        </div>
      )}

      {totalSubtasks > 0 && (
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Progress subtask</span>
            <span className="font-semibold">{doneSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {onClick && (
        <Button variant="ghost" size="sm" className="w-full mt-3 text-secondary hover:text-secondary hover:bg-secondary/10">
          Lihat Detail →
        </Button>
      )}
    </Card>
  );
};