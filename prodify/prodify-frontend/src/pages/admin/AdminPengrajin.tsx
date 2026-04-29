import { useStore, formatRupiah } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Phone, Award } from "lucide-react";

export default function AdminPengrajin() {
  const { users, orders, points } = useStore();
  const pengrajin = users.filter((u) => u.role === "pengrajin");

  const busyMap = new Map<string, number>();
  orders.forEach((o) =>
    o.subtasks.forEach((s) => {
      if (s.assignedTo && s.status === "On Progress") {
        busyMap.set(s.assignedTo, (busyMap.get(s.assignedTo) ?? 0) + 1);
      }
    })
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader title="Daftar Pengrajin" description="Spesialisasi, status, dan total upah masing-masing pengrajin." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pengrajin.map((u) => {
          const busy = (busyMap.get(u.id) ?? 0) > 0;
          const earnings = points.filter((p) => p.userId === u.id).reduce((sum, p) => sum + p.point, 0);
          const completed = points.filter((p) => p.userId === u.id).length;
          return (
            <Card key={u.id} className="p-5 hover:shadow-[var(--shadow-card)] transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-bold text-primary-foreground text-lg">
                    {u.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold",
                  busy ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-destructive" : "bg-success")} />
                  {busy ? `Sibuk (${busyMap.get(u.id)})` : "Available"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {u.specializations?.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">{s}</span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Total Upah</p>
                  <p className="font-bold text-foreground mt-0.5">{formatRupiah(earnings)}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Task Selesai</p>
                  <p className="font-bold text-foreground mt-0.5">{completed}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}