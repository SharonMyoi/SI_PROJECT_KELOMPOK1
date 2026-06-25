import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { AnimatedNumber } from "@/components/prodify/AnimatedNumber";
import { FillBar } from "@/components/prodify/FillBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah, cn } from "@/lib/utils";
import { Download, FileSpreadsheet, CalendarDays, TrendingUp, Award, Users, Search, ChevronDown, ChevronRight, ShoppingBag } from "lucide-react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

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

const CHART_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

type PengrajinDetail = {
  userId: string;
  name: string;
  specializations: string;
  tasks: number;
  totalUpah: number;
  entries: {
    date: string;
    orderCode: string;
    productName: string;
    partName: string;
    point: number;
  }[];
};

export default function OwnerPengrajinReport() {
  const { users, points } = useStore();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pengrajin = users.filter((u) => u.role === "pengrajin");

  const years = useMemo(() => {
    const s = new Set<string>();
    points.forEach((p) => {
      const d = new Date(p.date);
      s.add(d.getFullYear().toString());
    });
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [points]);

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

  const pointsInYear = useMemo(() => {
    if (!selectedYear) return [];
    return points.filter((p) => {
      const d = new Date(p.date);
      return d.getFullYear() === Number(selectedYear);
    });
  }, [points, selectedYear]);

  const yearTotalPengrajin = pengrajin.length;
  const yearTotalTasks = pointsInYear.length;
  const yearTotalUpah = pointsInYear.reduce((s, p) => s + p.point, 0);

  const chartData = useMemo(() => {
    if (!selectedYear) return [];
    const yearNum = Number(selectedYear);
    const monthMap = new Map<number, { upah: number; tugas: number }>();
    for (let i = 1; i <= 12; i++) monthMap.set(i, { upah: 0, tugas: 0 });

    points.forEach((p) => {
      const d = new Date(p.date);
      if (d.getFullYear() !== yearNum) return;
      const m = d.getMonth() + 1;
      const entry = monthMap.get(m)!;
      entry.upah += p.point;
      entry.tugas += 1;
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month: MONTHS_SHORT[month - 1],
      upah: data.upah,
      tugas: data.tugas,
    }));
  }, [selectedYear, points]);

  const pointsInMonth = useMemo(() => {
    if (!currentKey) return [];
    const { year, month } = parseMonthKey(currentKey);
    return points.filter((p) => {
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [points, currentKey]);

  const monthTotalUpah = pointsInMonth.reduce((s, p) => s + p.point, 0);
  const monthTotalTasks = pointsInMonth.length;
  const activePengrajinIds = new Set(pointsInMonth.map((p) => p.userId));
  const activeCount = activePengrajinIds.size;
  const avgUpah = activeCount > 0 ? Math.round(monthTotalUpah / activeCount) : 0;

  const dailyUpahTugasData = useMemo(() => {
    if (!currentKey) return [];
    const { year, month } = parseMonthKey(currentKey);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap = new Map<number, { upah: number; tugas: number }>();
    for (let d = 1; d <= daysInMonth; d++) dayMap.set(d, { upah: 0, tugas: 0 });

    pointsInMonth.forEach((p) => {
      const day = new Date(p.date).getDate();
      const entry = dayMap.get(day)!;
      entry.upah += p.point;
      entry.tugas += 1;
    });

    return Array.from(dayMap.entries()).map(([day, data]) => ({
      day: String(day),
      upah: data.upah,
      tugas: data.tugas,
    }));
  }, [pointsInMonth, currentKey]);

  const yearDetailRows: PengrajinDetail[] = useMemo(() => {
    const map = new Map<string, PengrajinDetail>();
    pointsInYear.forEach((p) => {
      if (!map.has(p.userId)) {
        const u = users.find((u) => u.id === p.userId);
        map.set(p.userId, {
          userId: p.userId,
          name: u?.name ?? "Unknown",
          specializations: u?.specializations?.join(", ") || "-",
          tasks: 0,
          totalUpah: 0,
          entries: [],
        });
      }
      const row = map.get(p.userId)!;
      row.tasks += 1;
      row.totalUpah += p.point;
      row.entries.push({
        date: new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        orderCode: p.orderCode,
        productName: p.productName,
        partName: p.partName,
        point: p.point,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalUpah - a.totalUpah);
  }, [pointsInYear, users]);

  const detailRows: PengrajinDetail[] = useMemo(() => {
    const map = new Map<string, PengrajinDetail>();
    pointsInMonth.forEach((p) => {
      if (!map.has(p.userId)) {
        const u = users.find((u) => u.id === p.userId);
        map.set(p.userId, {
          userId: p.userId,
          name: u?.name ?? "Unknown",
          specializations: u?.specializations?.join(", ") || "-",
          tasks: 0,
          totalUpah: 0,
          entries: [],
        });
      }
      const row = map.get(p.userId)!;
      row.tasks += 1;
      row.totalUpah += p.point;
      row.entries.push({
        date: new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        orderCode: p.orderCode,
        productName: p.productName,
        partName: p.partName,
        point: p.point,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalUpah - a.totalUpah);
  }, [pointsInMonth, users]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return detailRows;
    const q = searchQuery.toLowerCase();
    return detailRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.specializations.toLowerCase().includes(q) ||
        r.entries.some((e) =>
          e.productName.toLowerCase().includes(q) ||
          e.orderCode.toLowerCase().includes(q) ||
          e.partName.toLowerCase().includes(q)
        )
    );
  }, [detailRows, searchQuery]);

  const exportToExcel = (mode: "bulan" | "tahun") => {
    if (mode === "bulan") {
      if (!currentKey) return;
      const monthLabel = `${MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`;
      const wb = XLSX.utils.book_new();

      const ringkasanData = [
        ["Ringkasan", monthLabel],
        ["Total Pengrajin", pengrajin.length],
        ["Pengrajin Aktif", activeCount],
        ["Total Tugas Selesai", monthTotalTasks],
        ["Total Upah", monthTotalUpah],
        ["Rata-rata Upah", avgUpah],
      ];
      const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
      XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");

      const header = ["Nama", "Spesialisasi", "Tugas Selesai", "Total Upah"];
      const rows = detailRows.map((r) => [r.name, r.specializations, r.tasks, r.totalUpah]);
      const wsDetail = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Pengrajin");

      XLSX.writeFile(wb, `Laporan_Pengrajin_${monthLabel.replace(/\s/g, "_")}.xlsx`);
    } else {
      if (!selectedYear) return;
      const wb = XLSX.utils.book_new();
      const sortedMonths = availableMonths.sort((a, b) => a.index - b.index);

      sortedMonths.forEach(({ index }) => {
        const monthPoints = points.filter((p) => {
          const d = new Date(p.date);
          return d.getFullYear() === Number(selectedYear) && d.getMonth() + 1 === index;
        });
        const monthName = MONTHS[index - 1];
        const header = ["Nama", "Spesialisasi", "Tugas Selesai", "Total Upah"];
        const rows: any[][] = [];
        const map = new Map<string, { name: string; spes: string; tasks: number; total: number }>();
        monthPoints.forEach((p) => {
          if (!map.has(p.userId)) {
            const u = users.find((u) => u.id === p.userId);
            map.set(p.userId, { name: u?.name ?? "Unknown", spes: u?.specializations?.join(", ") || "-", tasks: 0, total: 0 });
          }
          const row = map.get(p.userId)!;
          row.tasks += 1;
          row.total += p.point;
        });
        Array.from(map.values()).forEach((r) => rows.push([r.name, r.spes, r.tasks, r.total]));
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, monthName.slice(0, 31));
      });

      XLSX.writeFile(wb, `Laporan_Pengrajin_Tahunan_${selectedYear}.xlsx`);
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
              {entry.dataKey === "upah" ? formatRupiah(entry.value) : `${entry.value} tugas`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Kinerja Pengrajin"
        description="Ringkasan upah, tugas, dan kinerja pengrajin per periode."
      />

      <Card className="w-fit mx-auto p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <div className="w-full sm:w-40">
            <p className="text-xs text-muted-foreground font-semibold mb-1.5">Tahun</p>
            <Select
              value={selectedYear}
              onValueChange={(v) => { setSelectedYear(v); setSelectedMonth(""); setSearchQuery(""); setExpandedId(null); }}
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
              onValueChange={(v) => { setSelectedMonth(v === "all" ? "" : v); setSearchQuery(""); setExpandedId(null); }}
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
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Pengrajin</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={yearTotalPengrajin} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <ShoppingBag className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Tugas Selesai</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={yearTotalTasks} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-foreground/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold opacity-80">Total Upah Dibayarkan</p>
                  <p className="text-xl font-bold"><AnimatedNumber value={yearTotalUpah} format={formatRupiah} /></p>
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
                <YAxis yAxisId="upah" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} label={{ value: "Upah", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                <YAxis yAxisId="tugas" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Tugas", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line yAxisId="upah" type="monotone" dataKey="upah" stroke="#f97316" strokeWidth={2} name="Upah" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="tugas" type="monotone" dataKey="tugas" stroke="#22c55e" strokeWidth={2} name="Tugas Selesai" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* DETAIL KINERJA PENGRAJIN - TAHUNAN */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-foreground">Detail Kinerja Pengrajin</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-semibold">
                  {yearDetailRows.length} pengrajin
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-center p-3 font-semibold whitespace-nowrap w-8"></th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Nama</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Spesialisasi</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Tugas Selesai</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Total Upah</th>
                  </tr>
                </thead>
                <tbody>
                  {yearDetailRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Belum ada data pengrajin.
                      </td>
                    </tr>
                  ) : (
                    yearDetailRows.map((r, i) => (
                      <>
                        <tr
                          key={r.userId}
                          className={cn("border-t border-border hover:bg-muted/30 cursor-pointer", i % 2 === 1 && "bg-muted/10")}
                          onClick={() => setExpandedId(expandedId === r.userId ? null : r.userId)}
                        >
                          <td className="p-3 text-center text-muted-foreground">
                            {expandedId === r.userId ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}
                          </td>
                          <td className="p-3 text-center font-semibold text-foreground whitespace-nowrap">{r.name}</td>
                          <td className="p-3 text-center text-muted-foreground text-xs whitespace-nowrap">{r.specializations}</td>
                          <td className="p-3 text-center font-semibold whitespace-nowrap">{r.tasks}</td>
                          <td className="p-3 text-center font-bold text-foreground whitespace-nowrap">{formatRupiah(r.totalUpah)}</td>
                        </tr>
                        {expandedId === r.userId && (
                          <tr key={`${r.userId}-detail`}>
                            <td colSpan={5} className="p-0">
                              <div className="bg-muted/20 border-t border-border">
                                {r.entries.length === 0 ? (
                                  <p className="p-4 text-sm text-muted-foreground text-center">Belum ada pekerjaan.</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground border-b border-border">
                                        <th className="p-2 pl-10 text-left font-semibold">Tanggal</th>
                                        <th className="p-2 text-left font-semibold">Produk</th>
                                        <th className="p-2 text-left font-semibold">Bagian</th>
                                        <th className="p-2 text-right font-semibold">Upah</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.entries.map((e, j) => (
                                        <tr key={j} className="border-b border-border/50">
                                          <td className="p-2 pl-10 text-muted-foreground whitespace-nowrap">{e.date}</td>
                                          <td className="p-2 text-foreground font-medium whitespace-nowrap">{e.productName}</td>
                                          <td className="p-2 text-muted-foreground whitespace-nowrap">{e.partName}</td>
                                          <td className="p-2 text-right text-success font-semibold whitespace-nowrap">+{formatRupiah(e.point)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selectedMonth && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Pengrajin</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={pengrajin.length} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Pengrajin Aktif</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={activeCount} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <ShoppingBag className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Tugas Selesai</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthTotalTasks} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Upah</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={monthTotalUpah} format={formatRupiah} /></p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Award className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Rata-rata Upah</p>
                  <p className="text-xl font-bold text-foreground"><AnimatedNumber value={avgUpah} format={formatRupiah} /></p>
                </div>
              </div>
            </Card>
          </div>

          {/* TREN KINERJA PENGRAJIN */}
          <Card className="p-5">
            <h2 className="font-bold text-foreground mb-1">Tren Kinerja Pengrajin</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
            </p>
            {dailyUpahTugasData.every((d) => d.upah === 0 && d.tugas === 0) ? (
              <p className="text-center text-muted-foreground py-8">Belum ada data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyUpahTugasData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Tanggal", position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis yAxisId="upah" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} label={{ value: "Upah", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis yAxisId="tugas" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Tugas", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line yAxisId="upah" type="monotone" dataKey="upah" stroke="#f97316" strokeWidth={2} name="Upah" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="tugas" type="monotone" dataKey="tugas" stroke="#22c55e" strokeWidth={2} name="Tugas Selesai" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-foreground">Detail Kinerja Pengrajin</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-semibold">
                  {filteredRows.length} pengrajin
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan nama, spesialisasi, produk..."
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
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-center p-3 font-semibold whitespace-nowrap w-8"></th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">Nama</th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">Spesialisasi</th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">Tugas Selesai</th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">Total Upah</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {searchQuery ? "Tidak ada hasil yang cocok." : "Belum ada data pengrajin."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, i) => (
                    <>
                      <tr
                        key={r.userId}
                        className={cn("border-t border-border hover:bg-muted/30 cursor-pointer", i % 2 === 1 && "bg-muted/10")}
                        onClick={() => setExpandedId(expandedId === r.userId ? null : r.userId)}
                      >
                        <td className="p-3 text-center text-muted-foreground">
                          {expandedId === r.userId ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}
                        </td>
                        <td className="p-3 text-center font-semibold text-foreground whitespace-nowrap">{r.name}</td>
                        <td className="p-3 text-center text-muted-foreground text-xs whitespace-nowrap">{r.specializations}</td>
                        <td className="p-3 text-center font-semibold whitespace-nowrap">{r.tasks}</td>
                        <td className="p-3 text-center font-bold text-foreground whitespace-nowrap">{formatRupiah(r.totalUpah)}</td>
                      </tr>
                      {expandedId === r.userId && (
                        <tr key={`${r.userId}-detail`}>
                          <td colSpan={5} className="p-0">
                            <div className="bg-muted/20 border-t border-border">
                              {r.entries.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground text-center">Belum ada pekerjaan.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                      <th className="p-2 pl-10 text-left font-semibold">Tanggal</th>
                                      <th className="p-2 text-left font-semibold">Produk</th>
                                      <th className="p-2 text-left font-semibold">Bagian</th>
                                      <th className="p-2 text-right font-semibold">Upah</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.entries.map((e, j) => (
                                      <tr key={j} className="border-b border-border/50">
                                        <td className="p-2 pl-10 text-muted-foreground whitespace-nowrap">{e.date}</td>
                                        <td className="p-2 text-foreground font-medium whitespace-nowrap">{e.productName}</td>
                                        <td className="p-2 text-muted-foreground whitespace-nowrap">{e.partName}</td>
                                        <td className="p-2 text-right text-success font-semibold whitespace-nowrap">+{formatRupiah(e.point)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {selectedYear && !selectedMonth && chartData.every((d) => d.upah === 0 && d.tugas === 0) && (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Belum ada data kinerja pengrajin di tahun {selectedYear}.</p>
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
