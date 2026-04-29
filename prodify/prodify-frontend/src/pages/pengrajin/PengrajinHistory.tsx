import { useStore, formatRupiah } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Award, Calendar, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/prodify/EmptyState";
import { History } from "lucide-react";

export default function PengrajinHistory() {
  const { currentUser, points } = useStore();
  if (!currentUser) return null;
  const mine = points.filter((p) => p.userId === currentUser.id).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const total = mine.reduce((s, p) => s + p.point, 0);

  // group by month
  const monthMap = new Map<string, number>();
  mine.forEach((p) => {
    const k = new Date(p.date).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    monthMap.set(k, (monthMap.get(k) ?? 0) + p.point);
  });
  const thisMonth = mine.filter((p) => {
    const d = new Date(p.date);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, p) => s + p.point, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Riwayat & Upah" description="Total upah dan rekap pekerjaan Anda." />

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          <Award className="h-5 w-5 mb-2" />
          <p className="text-xs uppercase tracking-wider opacity-80">Total Upah</p>
          <p className="text-2xl font-bold mt-1">{formatRupiah(total)}</p>
        </Card>
        <Card className="p-5">
          <TrendingUp className="h-5 w-5 mb-2 text-secondary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Bulan Ini</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{formatRupiah(thisMonth)}</p>
        </Card>
        <Card className="p-5">
          <Calendar className="h-5 w-5 mb-2 text-secondary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Task Selesai</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{mine.length}</p>
        </Card>
      </div>

      {mine.length === 0 ? (
        <EmptyState icon={History} title="Belum ada riwayat" description="Selesaikan task untuk mulai mengumpulkan poin upah." />
      ) : (
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-foreground">Daftar Pekerjaan</h2>
          </div>
          <div className="divide-y divide-border">
            {mine.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{p.productName}</p>
                  <p className="text-xs text-muted-foreground">{p.orderCode} • Bagian {p.partName} • {new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <p className="font-bold text-success shrink-0">+{formatRupiah(p.point)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}