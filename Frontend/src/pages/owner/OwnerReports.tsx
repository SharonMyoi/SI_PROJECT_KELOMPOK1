import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { AnimatedNumber } from "@/components/prodify/AnimatedNumber";
import { FillBar } from "@/components/prodify/FillBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah, cn } from "@/lib/utils";
import { Download, FileSpreadsheet, CalendarDays, TrendingUp, Award, ClipboardList, Search, Package, ShoppingBag, Store } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import { Order, Product } from "@/types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

type DetailRow = {
  code: string;
  tanggal: string;
  productName: string;
  customerName: string;
  source: string;
  category: string;
  type: string;
  basePrice: number;
  quantity: number;
  subtotal: number;
  pengrajin: string;
  totalUpah: number;
};

function buildProductQtyMap(orders: Order[]) {
  const map = new Map<string, number>();
  orders.forEach((o) => {
    map.set(o.productName, (map.get(o.productName) ?? 0) + o.quantity);
  });
  return map;
}

export default function OwnerReports() {
  const { orders, products, users } = useStore();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const years = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      s.add(d.getFullYear().toString());
    });
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const [selectedYear, setSelectedYear] = useState<string>(years[0] ?? "");

  useEffect(() => {
    if (selectedYear === "" && years.length > 0) {
      setSelectedYear(years.includes("2026") ? "2026" : years[0]);
    }
  }, [years, selectedYear]);

  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    return Array.from({ length: 12 }, (_, i) => ({
      key: getMonthKey(Number(selectedYear), i + 1),
      index: i + 1,
    }));
  }, [selectedYear]);

  const currentKey = selectedYear && selectedMonth ? getMonthKey(Number(selectedYear), Number(selectedMonth)) : null;

  const ordersInSelectedYear = useMemo(() => {
    if (!selectedYear) return [];
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === Number(selectedYear);
    });
  }, [orders, selectedYear]);

  const yearCustomCount = useMemo(
    () => ordersInSelectedYear.filter((o) => o.type === "custom").length,
    [ordersInSelectedYear]
  );
  const yearReadyStockCount = useMemo(
    () => ordersInSelectedYear.filter((o) => o.type === "ready_stock").length,
    [ordersInSelectedYear]
  );
  const yearRevenue = useMemo(
    () => ordersInSelectedYear.reduce((s, o) => {
      const p = products.find((x) => x.id === o.productId);
      return s + (p?.basePrice ?? 0) * o.quantity;
    }, 0),
    [ordersInSelectedYear, products]
  );

  const chartData = useMemo(() => {
    if (!selectedYear) return [];
    const yearNum = Number(selectedYear);
    const monthMap = new Map<number, { unit: number; revenue: number }>();
    for (let i = 1; i <= 12; i++) monthMap.set(i, { unit: 0, revenue: 0 });

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (d.getFullYear() !== yearNum) return;
      const m = d.getMonth() + 1;
      const entry = monthMap.get(m)!;
      entry.unit += o.quantity;
      const p = products.find((x) => x.id === o.productId);
      entry.revenue += (p?.basePrice ?? 0) * o.quantity;
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month: MONTHS_SHORT[month - 1],
      unit: data.unit,
      revenue: data.revenue,
    }));
  }, [selectedYear, orders, products]);

  const ordersInSelectedMonth = useMemo(() => {
    if (!currentKey) return [];
    const { year, month } = parseMonthKey(currentKey);
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [orders, currentKey]);

  const monthMeta = useMemo(() => {
    const revenue = ordersInSelectedMonth.reduce((s, o) => {
      const p = products.find((x) => x.id === o.productId);
      return s + (p?.basePrice ?? 0) * o.quantity;
    }, 0);
    const upah = ordersInSelectedMonth.reduce((s, o) => {
      return s + o.subtasks.reduce((sum, st) => sum + st.point, 0) * o.quantity;
    }, 0);
    const customCount = ordersInSelectedMonth.filter((o) => o.type === "custom").length;
    const readyStockCount = ordersInSelectedMonth.filter((o) => o.type === "ready_stock").length;
    return { revenue, upah, customCount, readyStockCount, totalOrders: ordersInSelectedMonth.length };
  }, [ordersInSelectedMonth, currentKey, products]);

  const monthProductQty = useMemo(() => buildProductQtyMap(ordersInSelectedMonth), [ordersInSelectedMonth]);

  const sortedProducts = useMemo(() => {
    return Array.from(monthProductQty.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthProductQty]);

  const maxProductQty = sortedProducts[0]?.[1] ?? 1;

  const dailyTypeData = useMemo(() => {
    if (!currentKey) return [];
    const { year, month } = parseMonthKey(currentKey);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap = new Map<number, { custom: number; readyStock: number }>();
    for (let d = 1; d <= daysInMonth; d++) dayMap.set(d, { custom: 0, readyStock: 0 });

    ordersInSelectedMonth.forEach((o) => {
      const day = new Date(o.createdAt).getDate();
      const entry = dayMap.get(day)!;
      if (o.type === "custom") entry.custom += o.quantity;
      else entry.readyStock += o.quantity;
    });

    return Array.from(dayMap.entries()).map(([day, data]) => ({
      day: String(day),
      custom: data.custom,
      readyStock: data.readyStock,
    }));
  }, [ordersInSelectedMonth, currentKey]);

  const detailRows: DetailRow[] = useMemo(() => {
    return ordersInSelectedMonth.map((o) => {
      const p = products.find((x) => x.id === o.productId);
      const subtotal = (p?.basePrice ?? 0) * o.quantity;
      const subtaskTotal = o.subtasks.reduce((s, st) => s + st.point, 0);
      const totalUpah = subtaskTotal * o.quantity;
      const assignedNames = o.subtasks
        .filter((st) => st.assignedTo)
        .map((st) => users.find((u) => u.id === st.assignedTo)?.name ?? "")
        .filter(Boolean)
        .join(", ");
      return {
        code: o.code,
        tanggal: new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        productName: o.productName,
        customerName: o.customerName,
        source: o.source || "-",
        category: p?.category || "-",
        type: o.type === "custom" ? "Custom" : "Ready Stock",
        basePrice: p?.basePrice ?? 0,
        quantity: o.quantity,
        subtotal,
        pengrajin: assignedNames || "-",
        totalUpah,
      };
    });
  }, [ordersInSelectedMonth, products, users]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return detailRows;
    const q = searchQuery.toLowerCase();
    return detailRows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.tanggal.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.pengrajin.toLowerCase().includes(q) ||
        formatRupiah(r.basePrice).toLowerCase().includes(q) ||
        formatRupiah(r.subtotal).toLowerCase().includes(q) ||
        formatRupiah(r.totalUpah).toLowerCase().includes(q) ||
        r.quantity.toString().includes(q)
    );
  }, [detailRows, searchQuery]);

  const exportToExcel = (mode: "bulan" | "tahun") => {
    if (mode === "bulan") {
      if (!currentKey) return;
      const monthLabel = `${MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`;
      const wb = XLSX.utils.book_new();

      const ringkasanData = [
        ["Ringkasan", monthLabel],
        ["Total Pesanan", monthMeta.totalOrders],
        ["Pesanan Custom", monthMeta.customCount],
        ["Pesanan Ready Stock", monthMeta.readyStockCount],
        ["Total Pendapatan", monthMeta.revenue],
        ["Total Upah", monthMeta.upah],
      ];
      const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
      XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");

      const header = ["Kode", "Tanggal", "Pelanggan", "Produk", "Sumber Pesanan", "Kategori", "Tipe", "Harga", "Qty", "Subtotal", "Pengrajin"];
      const rows = detailRows.map((r) => [r.code, r.tanggal, r.customerName, r.productName, r.source, r.category, r.type, r.basePrice, r.quantity, r.subtotal, r.pengrajin]);
      const wsDetail = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Pesanan");

      XLSX.writeFile(wb, `Laporan_Bulanan_${monthLabel.replace(/\s/g, "_")}.xlsx`);
    } else {
      if (!selectedYear) return;
      const wb = XLSX.utils.book_new();
      const sortedMonths = availableMonths.sort((a, b) => a.index - b.index);

      sortedMonths.forEach(({ index }) => {
        const ordersInMonth = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === Number(selectedYear) && d.getMonth() + 1 === index;
        });
        const monthName = MONTHS[index - 1];
        const header = ["Kode", "Tanggal", "Pelanggan", "Produk", "Sumber Pesanan", "Kategori", "Tipe", "Harga", "Qty", "Subtotal", "Pengrajin"];
        const rows: any[][] = [];
        ordersInMonth.forEach((o) => {
          const p = products.find((x) => x.id === o.productId);
          const subtotal = (p?.basePrice ?? 0) * o.quantity;
          const assignedNames = o.subtasks
            .filter((st) => st.assignedTo)
            .map((st) => users.find((u) => u.id === st.assignedTo)?.name ?? "")
            .filter(Boolean)
            .join(", ");
          const tanggal = new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
          rows.push([o.code, tanggal, o.customerName, o.productName, o.source || "-", p?.category || "-", o.type === "custom" ? "Custom" : "Ready Stock", p?.basePrice ?? 0, o.quantity, subtotal, assignedNames || "-"]);
        });
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, monthName.slice(0, 31));
      });

      XLSX.writeFile(wb, `Laporan_Tahunan_${selectedYear}.xlsx`);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm space-y-1.5">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {entry.dataKey === "unit" ? `${entry.value} pcs` : formatRupiah(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Bulanan"
        description="Ringkasan pendapatan, pesanan, dan upah pengrajin per periode."
      />

      <Card className="w-fit mx-auto p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <div className="w-full sm:w-40">
            <p className="text-xs text-muted-foreground font-semibold mb-1.5">Tahun</p>
            <Select
              value={selectedYear}
              onValueChange={(v) => { setSelectedYear(v); setSelectedMonth(""); setSearchQuery(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-40">
            <p className="text-xs text-muted-foreground font-semibold mb-1.5">Bulan</p>
            <Select
              value={selectedMonth}
              onValueChange={(v) => { setSelectedMonth(v === "all" ? "" : v); setSearchQuery(""); }}
              disabled={!selectedYear}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {availableMonths.map(({ index }) => (
                  <SelectItem key={index} value={String(index)}>
                    {MONTHS[index - 1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


        </div>
      </Card>

      {selectedYear && !selectedMonth && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Pesanan Custom</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={yearCustomCount} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Store className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Pesanan Ready Stock</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={yearReadyStockCount} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-foreground/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold opacity-80">Total Pendapatan</p>
                  <p className="text-xl font-bold"><AnimatedNumber value={yearRevenue} format={formatRupiah} /></p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-bold text-foreground mb-4">Tren Bulanan {selectedYear}</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="unit" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Unit Terjual", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} label={{ value: "Pendapatan", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line yAxisId="unit" type="monotone" dataKey="unit" stroke="#22c55e" strokeWidth={2} name="Unit Terjual" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Pendapatan" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {selectedMonth && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Pesanan</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthMeta.totalOrders} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <ShoppingBag className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Pesanan Custom</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthMeta.customCount} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Store className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Pesanan Ready Stock</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthMeta.readyStockCount} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Pendapatan</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthMeta.revenue} format={formatRupiah} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Award className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Upah</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthMeta.upah} format={formatRupiah} /></p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-bold text-foreground mb-1">Produk Terlaris</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
            </p>
            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
              {sortedProducts.map(([name, qty], i) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      {i < 5 && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                      )}
                      <span className={cn("truncate", i < 5 ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {name}
                      </span>
                    </span>
                    <span className={cn("shrink-0", i < 5 ? "font-bold text-secondary" : "text-muted-foreground")}>
                      {qty} pcs
                    </span>
                  </div>
                  <FillBar value={qty} max={maxProductQty} barClassName={i < 5 ? "bg-gradient-to-r from-primary to-primary-glow" : "bg-muted-foreground/30"} />
                </div>
              ))}
            </div>
          </Card>

          {/* LINE CHART TIPE PESANAN */}
          <Card className="p-5">
            <h2 className="font-bold text-foreground mb-1">Tren Tipe Pesanan</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
            </p>
            {dailyTypeData.every((d) => d.custom === 0 && d.readyStock === 0) ? (
              <p className="text-center text-muted-foreground py-8">Belum ada data pesanan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTypeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Tanggal", position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Unit Terjual", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="custom" stroke="#7c3aed" strokeWidth={2} name="Custom" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="readyStock" stroke="#10b981" strokeWidth={2} name="Ready Stock" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-foreground">Detail Pesanan</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-semibold">
                  {filteredRows.length} pesanan
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan kode, pelanggan, produk, sumber, kategori, tipe, pengrajin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 shrink-0">
                      <Download className="h-4 w-4" /> Download Excel
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportToExcel("bulan")} className="gap-3">
                      <CalendarDays className="h-4 w-4 text-secondary" />
                      Per Bulan ({MONTHS[Number(selectedMonth) - 1]} {selectedYear})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToExcel("tahun")} className="gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Per Tahun ({selectedYear})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Kode</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Tanggal</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Pelanggan</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Produk</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Sumber</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Kategori</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Tipe</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Harga</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Qty</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Subtotal</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Pengrajin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted-foreground">
                        {searchQuery ? "Tidak ada hasil yang cocok." : "Tidak ada data pesanan."}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr key={r.code} className={cn("border-t border-border hover:bg-muted/30", i % 2 === 1 && "bg-muted/10")}>
                        <td className="p-3 text-center font-mono text-xs font-semibold text-secondary whitespace-nowrap">{r.code}</td>
                        <td className="p-3 text-center text-muted-foreground whitespace-nowrap">{r.tanggal}</td>
                        <td className="p-3 text-center text-foreground whitespace-nowrap">{r.customerName}</td>
                        <td className="p-3 text-center font-medium text-foreground whitespace-nowrap">{r.productName}</td>
                        <td className="p-3 text-center text-muted-foreground whitespace-nowrap">{r.source}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                            {r.category}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            r.type === "Custom" ? "bg-violet-500/15 text-violet-600" : "bg-emerald-500/15 text-emerald-600"
                          )}>
                            {r.type}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">{formatRupiah(r.basePrice)}</td>
                        <td className="p-3 text-center font-semibold whitespace-nowrap">{r.quantity}</td>
                        <td className="p-3 text-center font-bold text-foreground whitespace-nowrap">{formatRupiah(r.subtotal)}</td>
                        <td className="p-3 text-center text-muted-foreground text-xs max-w-[120px] truncate whitespace-nowrap">{r.pengrajin}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selectedYear && !selectedMonth && chartData.every((d) => d.unit === 0 && d.revenue === 0) && (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Belum ada data penjualan di tahun {selectedYear}.</p>
        </Card>
      )}

      {!selectedYear && (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Pilih tahun untuk melihat laporan.</p>
        </Card>
      )}
    </div>
  );
}
