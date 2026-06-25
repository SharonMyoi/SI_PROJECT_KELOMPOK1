import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, CheckCircle2, Clock, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/prodify/EmptyState";
import { buildAutoNotifications, filterByRole } from "@/lib/autoNotifications";
import { useMemo } from "react";

const iconMap = {
  deadline: Clock,
  task_done: CheckCircle2,
  stock_low: AlertTriangle,
  info: Bell,
  task_assigned: Bell,
};

const colorMap = {
  deadline: "bg-warning/15 text-warning",
  task_done: "bg-success/15 text-success",
  stock_low: "bg-destructive/15 text-destructive",
  info: "bg-primary/15 text-primary-foreground",
  task_assigned: "bg-secondary/15 text-secondary",
};

export default function Notifications() {
  const { currentUser, notifications, orders, products, dismissedAutoNotifs, markNotificationRead, markAllNotificationsRead } = useStore();
  const list = useMemo(() => {
    if (!currentUser) return [];
    const auto = buildAutoNotifications(orders, products)
      .map((n) => ({ ...n, read: n.read || dismissedAutoNotifs.includes(n.id) }));
    const merged = [...auto, ...notifications];
    return filterByRole(merged, currentUser.role).sort(
      (a, b) => +new Date(b.date) - +new Date(a.date)
    );
  }, [currentUser, notifications, orders, products, dismissedAutoNotifs]);

  const unreadCount = useMemo(() => list.filter((n) => !n.read).length, [list]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <PageHeader title="Notifikasi" description="Tenggat, tugas selesai, dan peringatan stok." />
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllNotificationsRead(currentUser?.role)}
            className="shrink-0 gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Tandai semua dibaca
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Bell} title="Belum ada notifikasi" />
      ) : (
        <div className="space-y-2">
          {list.map((n) => {
            const Icon = iconMap[n.type];
            return (
              <Card
                key={n.id}
                className={cn(
                  "p-4 flex gap-3 transition-all",
                  !n.read && "border-l-4 border-l-primary bg-primary/5"
                )}
              >
                <div className={cn("p-2.5 rounded-lg h-fit", colorMap[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("font-semibold", n.read ? "text-muted-foreground" : "text-foreground")}>{n.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(n.date).toLocaleDateString("id-ID")}</span>
                  </div>
                  <p className={cn("text-sm mt-0.5", n.read ? "text-muted-foreground/60" : "text-muted-foreground")}>{n.message}</p>
                </div>
                {!n.read && (
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => markNotificationRead(n.id)}
                      title="Tandai telah dibaca"
                    >
                      <CheckCheck className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}