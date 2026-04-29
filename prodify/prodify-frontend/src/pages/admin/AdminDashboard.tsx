import { useStore, formatRupiah, daysUntil } from "@/store/useStore";
import { StatCard } from "@/components/prodify/StatCard";
import { PageHeader } from "@/components/prodify/PageHeader";
import { OrderCard } from "@/components/prodify/OrderCard";
import { ClipboardList, Zap, Users, AlertTriangle, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { orders, products, users, notifications } = useStore();
  const navigate = useNavigate();

  const activeOrders = orders.filter((o) => o.status !== "Done");
  const fastTrackActive = activeOrders.filter((o) => o.fastTrack);
  const pengrajin = users.filter((u) => u.role === "pengrajin");
  const busyIds = new Set(
    orders.flatMap((o) =>
      o.subtasks.filter((s) => s.assignedTo && s.status === "On Progress").map((s) => s.assignedTo!)
    )
  );
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const recent = activeOrders.slice(0, 4);
  const adminNotifs = notifications.filter((n) => n.forRole === "admin" || n.forRole === "all").slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader title="Dashboard Admin" description="Ringkasan aktivitas produksi RieFa Collection hari ini." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Order Aktif" value={activeOrders.length} icon={ClipboardList} variant="primary" />
        <StatCard label="Fast Track Aktif" value={`${fastTrackActive.length}/10`} icon={Zap} variant="destructive" hint="maks. 10 pesanan" />
        <StatCard label="Pengrajin Sibuk" value={`${busyIds.size}/${pengrajin.length}`} icon={Users} variant="secondary" />
        <StatCard label="Stok Menipis" value={lowStock.length} icon={AlertTriangle} variant="warning" hint={lowStock.length ? "perlu produksi" : "aman"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Pesanan Terbaru</h2>
            <button onClick={() => navigate("/admin/orders")} className="text-sm font-medium text-secondary hover:text-secondary/80">Lihat semua →</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {recent.map((o) => (
              <OrderCard key={o.id} order={o} onClick={() => navigate(`/admin/orders/${o.id}`)} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-secondary" />
              <h2 className="font-bold text-foreground">Status Pengrajin</h2>
            </div>
            <div className="space-y-2.5">
              {pengrajin.map((p) => {
                const busy = busyIds.has(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.specializations?.join(", ")}</p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold",
                      busy ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-destructive" : "bg-success")} />
                      {busy ? "Sibuk" : "Available"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-secondary" />
              <h2 className="font-bold text-foreground">Notifikasi Terbaru</h2>
            </div>
            <div className="space-y-2">
              {adminNotifs.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada notifikasi.</p>}
              {adminNotifs.map((n) => (
                <div key={n.id} className={cn("p-2.5 rounded-lg text-xs", n.read ? "bg-muted/50" : "bg-primary/10 border border-primary/30")}>
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <p className="text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}