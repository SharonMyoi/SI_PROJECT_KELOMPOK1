import { useStore, formatRupiah } from "@/store/useStore";
import { StatCard } from "@/components/prodify/StatCard";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { ClipboardList, Zap, Users, AlertTriangle, TrendingUp, Package } from "lucide-react";
import { OrderCard } from "@/components/prodify/OrderCard";
import { cn } from "@/lib/utils";

export default function OwnerDashboard() {
  const { orders, products, users, points } = useStore();
  const activeOrders = orders.filter((o) => o.status !== "Done");
  const fastTrack = activeOrders.filter((o) => o.fastTrack);
  const pengrajin = users.filter((u) => u.role === "pengrajin");
  const busyIds = new Set(orders.flatMap((o) => o.subtasks.filter((s) => s.assignedTo && s.status === "On Progress").map((s) => s.assignedTo!)));
  const lowStock = products.filter((p) => p.stock <= p.minStock);

  const thisMonthRevenue = orders
    .filter((o) => {
      const d = new Date(o.createdAt);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    })
    .reduce((s, o) => {
      const p = products.find((x) => x.id === o.productId);
      return s + (p?.basePrice ?? 0) * o.quantity;
    }, 0);

  // top performers
  const earnings = pengrajin
    .map((u) => ({
      ...u,
      total: points.filter((p) => p.userId === u.id).reduce((s, p) => s + p.point, 0),
      tasks: points.filter((p) => p.userId === u.id).length,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader title="Dashboard Owner" description="Monitor produksi, stok, dan performa pengrajin secara real-time." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Order Aktif" value={activeOrders.length} icon={ClipboardList} variant="primary" />
        <StatCard label="Fast Track" value={`${fastTrack.length}/10`} icon={Zap} variant="destructive" />
        <StatCard label="Pengrajin Sibuk" value={`${busyIds.size}/${pengrajin.length}`} icon={Users} variant="secondary" />
        <StatCard label="Stok Menipis" value={lowStock.length} icon={AlertTriangle} variant="warning" />
      </div>

      <Card className="p-5 bg-gradient-to-br from-secondary via-secondary to-secondary/80 text-secondary-foreground">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-secondary-foreground/70 font-semibold">Estimasi Pendapatan Bulan Ini</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{formatRupiah(thisMonthRevenue)}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/30">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-foreground">Pesanan Berjalan</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {activeOrders.slice(0, 4).map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-secondary" /> Status Pengrajin</h2>
            <div className="space-y-2.5">
              {pengrajin.map((p) => {
                const busy = busyIds.has(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate flex-1">{p.name}</p>
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold",
                      busy ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-destructive" : "bg-success")} />
                      {busy ? "Sibuk" : "Available"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {lowStock.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-destructive" /> Stok Menipis</h2>
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="text-lg">{p.image}</span> {p.name}</span>
                    <span className="font-bold text-destructive">{p.stock} pcs</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-secondary" /> Top Performer Pengrajin</h2>
        <div className="space-y-2">
          {earnings.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">{e.tasks} task selesai</p>
              </div>
              <p className="font-bold text-foreground">{formatRupiah(e.total)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}