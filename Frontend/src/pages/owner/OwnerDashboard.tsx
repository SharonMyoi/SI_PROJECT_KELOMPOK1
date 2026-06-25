// REVISI LOKAL: Mengeluarkan formatRupiah dari import useStore agar dashboard owner tidak crash
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { StatCard } from "@/components/prodify/StatCard";
import { PageHeader } from "@/components/prodify/PageHeader";
import { AnimatedNumber } from "@/components/prodify/AnimatedNumber";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Zap, Users, AlertTriangle, TrendingUp, Package } from "lucide-react";
import { OrderCard } from "@/components/prodify/OrderCard";
import { cn } from "@/lib/utils";

// REVISI LOKAL: Menyediakan fungsi kosmetik format rupiah mandiri secara lokal khusus di file ini
const formatRupiah = (value: number | string) => {
  const numeric = typeof value === "number" ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(numeric);
};

export default function OwnerDashboard() {
  const { orders, products, users, points } = useStore();
  const activeOrders = orders.filter((o) => o.status !== "Selesai");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const displayedOrders = showAllOrders ? activeOrders : activeOrders.slice(0, 9);
  const fastTrack = activeOrders.filter((o) => o.fastTrack);
  const pengrajin = users.filter((u) => u.role === "pengrajin");
  const busyIds = new Set(orders.flatMap((o) => o.subtasks.filter((s) => s.assignedTo && s.status === "Sedang Dikerjakan").map((s) => s.assignedTo!)));

  const getProductTotalStock = (p: any) => {
    if (typeof p.stock === "number") return p.stock;
    if (p.stock && typeof p.stock === "object") {
      return Object.values(p.stock).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
    }
    return 0;
  };

  const lowStock = products.filter((p) => getProductTotalStock(p) <= p.minStock);

  // Beban kerja: jumlah subtugas aktif (Waiting / On Progress) per pengrajin (FR-52)
  const workloadMap = new Map<string, number>();
  orders.forEach((o) => {
    o.subtasks.forEach((s) => {
      if (s.assignedTo && s.status !== "Selesai") {
        workloadMap.set(s.assignedTo, (workloadMap.get(s.assignedTo) ?? 0) + 1);
      }
    });
  });

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

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };

  // top performers bulan ini
  const earnings = pengrajin
    .map((u) => ({
      ...u,
      total: points
        .filter((p) => p.userId === u.id && isThisMonth(p.date))
        .reduce((s, p) => s + p.point, 0),
      tasks: points
        .filter((p) => p.userId === u.id && isThisMonth(p.date))
        .length,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Owner" description="Monitor produksi, stok, dan performa pengrajin secara real-time." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pesanan" value={activeOrders.length} icon={ClipboardList} variant="primary" />
        <StatCard label="Prioritas Tinggi" value={`${fastTrack.length}/10`} icon={Zap} variant="destructive" />
        <StatCard label="Pengrajin Sibuk" value={`${busyIds.size}/${pengrajin.length}`} icon={Users} variant="secondary" />
        <StatCard label="Stok Menipis" value={lowStock.length} icon={AlertTriangle} variant="warning" />
      </div>

      <Card className="p-5 bg-gradient-to-br from-secondary via-secondary to-secondary/80 text-secondary-foreground">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-secondary-foreground/70 font-semibold">Estimasi Pendapatan Bulan Ini</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1"><AnimatedNumber value={thisMonthRevenue} format={formatRupiah} /></p>
          </div>
          <div className="p-3 rounded-xl bg-primary/30">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
      </Card>

      {/* Pesanan Berjalan � 3 grid full width */}
      <div>
        <h2 className="font-bold text-foreground mb-4">Pesanan Berjalan</h2>
        <div className={showAllOrders ? "max-h-[680px] overflow-y-auto pr-1" : ""}>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
            {displayedOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>
        {activeOrders.length > 9 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAllOrders(!showAllOrders)}>
              {showAllOrders ? "Tampilkan Lebih Sedikit" : "Lihat Semua"}
            </Button>
          </div>
        )}
      </div>

      {/* Stok Menipis di bawah */}
      {lowStock.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-destructive" /> Stok Menipis</h2>
          <div className="space-y-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  {p.image.startsWith("data:") || p.image.startsWith("http") || p.image.startsWith("/") ? (
                    <img src={p.image} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <span className="text-lg">{p.image}</span>
                  )}
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="font-bold text-destructive">{getProductTotalStock(p)} pcs</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-5 flex flex-col">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2 shrink-0"><TrendingUp className="h-4 w-4 text-secondary" /> Pengrajin Terbaik Bulan Ini</h2>
          <div className="overflow-y-auto min-h-0 max-h-[400px] space-y-2">
            {earnings.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">{e.tasks} tugas selesai</p>
                </div>
                <p className="font-bold text-foreground">{formatRupiah(e.total)}</p>
              </div>
            ))}
          </div>
          </Card>
        </div>
        <div>
          <Card className="p-5 flex flex-col">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2 shrink-0"><Users className="h-4 w-4 text-secondary" /> Status Pengrajin</h2>
            <div className="flex flex-col min-h-0">
              <div className="overflow-y-auto min-h-0 space-y-2.5 max-h-[400px]">
                {pengrajin.map((p) => {
                  const busy = busyIds.has(p.id);
                  const load = workloadMap.get(p.id) ?? 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">Beban: {load} tugas aktif</p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold",
                        busy ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-destructive" : "bg-success")} />
                        {busy ? "Sibuk" : "Tersedia"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
