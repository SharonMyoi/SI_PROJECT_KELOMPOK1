import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Bell, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/prodify/EmptyState";

const iconMap = {
  deadline: Clock,
  task_done: CheckCircle2,
  stock_low: AlertTriangle,
  info: Bell,
};

const colorMap = {
  deadline: "bg-warning/15 text-warning",
  task_done: "bg-success/15 text-success",
  stock_low: "bg-destructive/15 text-destructive",
  info: "bg-primary/15 text-primary-foreground",
};

export default function Notifications() {
  const { currentUser, notifications, markNotificationRead } = useStore();
  const list = notifications.filter((n) => n.forRole === currentUser?.role || n.forRole === "all");

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Notifikasi" description="Deadline, task selesai, dan peringatan stok." />
      {list.length === 0 ? (
        <EmptyState icon={Bell} title="Belum ada notifikasi" />
      ) : (
        <div className="space-y-2">
          {list.map((n) => {
            const Icon = iconMap[n.type];
            return (
              <Card
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  "p-4 flex gap-3 cursor-pointer transition-all",
                  !n.read && "border-l-4 border-l-primary bg-primary/5"
                )}
              >
                <div className={cn("p-2.5 rounded-lg h-fit", colorMap[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{n.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(n.date).toLocaleDateString("id-ID")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}