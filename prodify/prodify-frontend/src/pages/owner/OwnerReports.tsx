import { useStore, formatRupiah } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";

export default function OwnerReports() {
  const { orders, products, points, users } = useStore();

  const monthly = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number; upah: number }>();
    orders.forEach((o) => {
      const k = new Date(o.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const cur = map.get(k) ?? { revenue: 0, orders: 0, upah: 0 };
      const p = products.find((x) => x.id === o.productId);
      cur.revenue += (p?.basePrice ?? 0) * o.quantity;
      cur.orders += 1;
      map.set(k, cur);
    });
    points.forEach((pt) => {
      const k = new Date(pt.date).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const cur = map.get(k) ?? { revenue: 0, orders: 0, upah: 0 };
      cur.upah += pt.point;
      map.set(k, cur);
    });
    return Array.from(map.entries()).sort((a, b) => +new Date(b[0]) - +new Date(a[0]));
  }, [orders, products, points]);

  const productPerformance = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => map.set(o.productName, (map.get(o.productName) ?? 0) + o.quantity));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const maxQty = Math.max(...productPerformance.map(([, q]) => q), 1);

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader title="Laporan Bulanan" description="Rekap pendapatan, pesanan, dan upah pengrajin." />

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-bold text-foreground">Ringkasan per Bulan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-semibold">Bulan</th>
                <th className="text-right p-3 font-semibold">Pesanan</th>
                <th className="text-right p-3 font-semibold">Pendapatan</th>
                <th className="text-right p-3 font-semibold">Total Upah</th>
                <th className="text-right p-3 font-semibold">Estimasi Profit</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(([month, m]) => (
                <tr key={month} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{month}</td>
                  <td className="p-3 text-right">{m.orders}</td>
                  <td className="p-3 text-right font-semibold">{formatRupiah(m.revenue)}</td>
                  <td className="p-3 text-right text-secondary">{formatRupiah(m.upah)}</td>
                  <td className="p-3 text-right font-bold text-success">{formatRupiah(m.revenue - m.upah)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-foreground mb-4">Produk Terlaris</h2>
        <div className="space-y-3">
          {productPerformance.map(([name, qty]) => (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-foreground">{name}</span>
                <span className="font-bold text-secondary">{qty} pcs</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${(qty / maxQty) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}