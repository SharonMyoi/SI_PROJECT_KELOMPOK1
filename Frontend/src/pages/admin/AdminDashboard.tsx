import { useState, useMemo, useRef, useEffect } from "react";
import { useStore, daysUntil } from "@/store/useStore";
import { StatCard } from "@/components/prodify/StatCard";
import { PageHeader } from "@/components/prodify/PageHeader";
import { ClipboardList, Zap, Users, AlertTriangle, Bell, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buildAutoNotifications, filterByRole } from "@/lib/autoNotifications";
import { getWaitingList, countActiveTasks, getCraftsmanStatus } from "@/lib/waitingList";
import { StatusBadge } from "@/components/prodify/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatus } from "@/types";

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, fill } = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg text-xs font-medium shadow-md" style={{ backgroundColor: fill, color: "#fff" }}>
      {name}: {value} pesanan
    </div>
  );
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 500;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prev.current = value;
  }, [value]);
  return <>{display}</>;
};

export default function AdminDashboard() {
  const { orders, products, users, notifications, locations } = useStore();
  const navigate = useNavigate();
  const [isAlertHidden, setIsAlertHidden] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [filterYear, setFilterYear] = useState("semua");
  const [filterMonth, setFilterMonth] = useState("semua");

  // --- LOGIKA STOK MENIPIS ---
  const lowStockList = products.flatMap((product) => {
    const stockData = product.stock || {};
    return Object.entries(stockData)
      .filter(([_, quantity]) => (quantity as number) <= product.minStock)
      .map(([locationId, quantity]) => {
        const loc = locations?.find((l: any) => l.id === locationId);
        return {
          productName: product.name,
          locationName: loc?.name || "Lokasi Tidak Dikenal",
          currentStock: quantity as number,
        };
      });
  });

  const activeOrders = orders.filter((o) => o.status !== "Selesai");
  const fastTrackActive = activeOrders.filter((o) => o.fastTrack);
  const pengrajin = users.filter((u) => u.role === "pengrajin");
  const activeTaskMap = countActiveTasks(orders);
  
  const busyCount = pengrajin.filter((p) => {
    const active = activeTaskMap.get(p.id) ?? 0;
    const cap = p.capacity ?? 5;
    if (cap === 0 && active === 0) return false;
    return getCraftsmanStatus(p, active) === "busy";
  }).length;
  
  const recent = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const allNotifs = filterByRole(
    [...buildAutoNotifications(orders, products), ...notifications],
    "admin"
  );

  const waitingCount = getWaitingList(orders).length;
  const overload = waitingCount > 10;

  const statusList: OrderStatus[] = ["Antrean", "Sedang Dikerjakan", "Penyusunan", "Siap Kirim", "Selesai"];
  const STATUS_HEX: Record<string, string> = {
    Antrean: "#CA8A04",
    "Sedang Dikerjakan": "#2563EB",
    Penyusunan: "#7c3aed",
    "Siap Kirim": "#ea580c",
    Selesai: "#059669",
  };

  const years = useMemo(() => {
    const y = orders.map((o) => new Date(o.createdAt).getFullYear());
    return [...new Set(y)].sort((a, b) => b - a);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (filterYear !== "semua" && d.getFullYear() !== Number(filterYear)) return false;
      if (filterMonth !== "semua" && d.getMonth() + 1 !== Number(filterMonth)) return false;
      return true;
    });
  }, [orders, filterYear, filterMonth]);

  const statusCounts = statusList.map((s) => ({
    status: s,
    count: filteredOrders.filter((o) => o.status === s).length,
  }));
  const pieData = statusCounts.map(({ status, count }) => ({
    name: status,
    value: count,
    fill: STATUS_HEX[status],
  }));
  const totalOrders = filteredOrders.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Admin" description="Ringkasan aktivitas produksi RieFa Collection hari ini." />

      {/* ALERT AREA */}
{/* --- ALERT AREA --- */}
{(overload || lowStockList.length > 0) && !isAlertDismissed && (
  <Card className="p-4 border-l-4 border-l-warning bg-warning/5 flex items-start gap-3 relative">
    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
    
    <div className="space-y-1 text-sm w-full">
      {/* Tombol X untuk menutup alert */}
      <button 
        onClick={() => setIsAlertDismissed(true)}
        className="absolute top-2 right-3 text-warning font-bold hover:bg-warning/20 px-2 py-0.5 rounded transition-colors"
        title="Tutup peringatan"
      >
        ✕
      </button>

      <div className="pr-8">
        {overload && (
          <p className="mb-2"><strong>Kelebihan Kapasitas:</strong> Antrean {waitingCount} Bagian (batas 10).</p>
        )}
        
        {lowStockList.length > 0 && (
          <div>
            <p className="font-bold ">Stok Menipis ({lowStockList.length} titik lokasi):</p>
            <ul className="list-disc pl-5 mt-1 text-xs text-muted-foreground space-y-0.5">
              {lowStockList.slice(0, 4).map((item, i) => (
                <li key={i}>
                  {item.productName} di <strong>{item.locationName}</strong> (Sisa: {item.currentStock})
                </li>
              ))}
              {lowStockList.length > 4 && <li>...dan {lowStockList.length - 4} lokasi lainnya</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  </Card>
)}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button onClick={() => navigate("/admin/orders")} className="text-left"><StatCard label="Total Pesanan" value={activeOrders.length} icon={ClipboardList} variant="primary" /></button>
        <button onClick={() => navigate("/admin/orders")} className="text-left"><StatCard label="Prioritas Tinggi" value={`${fastTrackActive.length}/10`} icon={Zap} variant="destructive" /></button>
        <button onClick={() => navigate("/admin/pengrajin")} className="text-left"><StatCard label="Pengrajin Sibuk" value={`${busyCount}/${pengrajin.length}`} icon={Users} variant="secondary" /></button>
        <button onClick={() => navigate("/admin/waiting-list")} className="text-left"><StatCard label="Daftar Tunggu" value={waitingCount} icon={Clock} variant={overload ? "destructive" : "secondary"} /></button>
        <button onClick={() => navigate("/admin/products")} className="text-left"><StatCard label="Stok Menipis" value={lowStockList.length} icon={AlertTriangle} variant="warning" /></button>
      </div>

      {/* ROW 1: DISTRIBUSI PESANAN + NOTIFIKASI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="font-bold text-foreground">Distribusi Pesanan</h2>
            <div className="flex items-center gap-2">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 text-xs w-[125px]">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tahun</SelectItem>
                  {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-8 text-xs w-[125px]">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Bulan</SelectItem>
                  {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"].map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-6">
            {totalOrders === 0 ? (
              <div className="flex items-center justify-center w-full h-[240px] text-sm text-muted-foreground">
                Belum ada pesanan
              </div>
            ) : (
              <>
                <div className="relative shrink-0">
                  <ResponsiveContainer width={260} height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={115}
                        dataKey="value"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-foreground"><AnimatedNumber value={totalOrders} /></span>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {statusCounts.map(({ status, count }) => (
                    <div key={status} className="flex justify-between items-center text-sm">
                      <span className="text-foreground">{status}</span>
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <AnimatedNumber value={count} />
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_HEX[status] }} />
                      </span>
                    </div>
                  ))}
                  <hr className="border-t border-border my-2" />
                  <div className="flex justify-between items-center text-sm font-semibold text-foreground">
                    <span>Total</span>
                    <span><AnimatedNumber value={totalOrders} /></span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-secondary" />
            <h2 className="font-bold text-foreground">Notifikasi Terbaru</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {allNotifs.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada notifikasi.</p>}
            {allNotifs.map((n) => (
              <div key={n.id} className={cn("p-2.5 rounded-lg text-xs", n.read ? "bg-muted/50" : "bg-primary/10 border border-primary/30")}>
                <p className="font-semibold text-foreground">{n.title}</p>
                <p className="text-muted-foreground mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ROW 2: TABLE PESANAN + STATUS PENGRAJIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden h-full">
            <div className="flex items-center justify-between px-2 py-3">
              <h2 className="text-lg font-bold text-foreground px-2">Pesanan Terbaru</h2>
              <button onClick={() => navigate("/admin/orders")} className="text-sm font-medium text-secondary hover:text-secondary/80 px-2">Lihat semua →</button>
            </div>
            <div className="w-full overflow-x-auto">
              <Table className="text-[11px] min-w-[600px] lg:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center px-2 py-3">Kode</TableHead>
                    <TableHead className="text-center px-2 py-3">Produk</TableHead>
                    <TableHead className="text-center px-2 py-3">Pelanggan</TableHead>
                    <TableHead className="text-center px-2 py-3">Sumber Pesanan</TableHead>
                    <TableHead className="text-center px-2 py-3">Qty</TableHead>
                    <TableHead className="text-center px-2 py-3">Tipe</TableHead>
                    <TableHead className="text-center px-2 py-3">Status</TableHead>
                    <TableHead className="text-center px-2 py-3">Tenggat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-xs">Belum ada order.</TableCell></TableRow>
                  )}
                  {recent.map((o) => {
                    const days = daysUntil(o.deadline);
                    return (
                      <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                        <TableCell className="text-center px-2 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono text-[11px] font-semibold text-secondary">{o.code}</span>
                            {o.fastTrack && <Zap className="h-3 w-3 text-destructive shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-center px-2 py-2.5 truncate max-w-[120px]">{o.productName}</TableCell>
                        <TableCell className="text-muted-foreground text-center px-2 py-2.5 truncate max-w-[100px]">{o.customerName}</TableCell>
                        <TableCell className="text-muted-foreground text-center font-medium px-2 py-2.5">{o.source || "-"}</TableCell>
                        <TableCell className="text-center px-2 py-2.5 font-medium">{o.quantity}</TableCell>
                        <TableCell className="text-center px-2 py-2.5">
                          {o.type === "ready_stock" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200 text-black">Ready Stock</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-300 text-neutral-900 border border-neutral-400/30">Custom</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2.5">
                          <div className="flex justify-center scale-90 origin-center"><StatusBadge status={o.status} /></div>
                        </TableCell>
                        <TableCell className={cn("text-center px-2 py-2.5 font-medium", days <= 1 ? "text-destructive font-semibold" : days <= 3 ? "text-warning font-semibold" : "")}>
                          H-{days}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <Card className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-secondary" />
            <h2 className="font-bold text-foreground">Status Pengrajin</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5">
            {pengrajin.map((p) => {
              const active = activeTaskMap.get(p.id) ?? 0;
              const cap = p.capacity ?? 5;
              let status = getCraftsmanStatus(p, active);
              if (cap === 0 && active === 0) status = "available";
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{active}/{cap} tugas</p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold", status === "busy" ? "bg-destructive/15 text-destructive" : status === "inactive" ? "bg-muted text-muted-foreground" : "bg-success/15 text-success")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", status === "busy" ? "bg-destructive" : status === "inactive" ? "bg-muted-foreground" : "bg-success")} />
                    {status === "busy" ? "Sibuk" : status === "inactive" ? "Nonaktif" : "Tersedia"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}