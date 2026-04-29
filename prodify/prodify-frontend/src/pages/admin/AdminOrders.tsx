import { useState } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { OrderCard } from "@/components/prodify/OrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderStatus } from "@/types";
import { EmptyState } from "@/components/prodify/EmptyState";
import { ClipboardList } from "lucide-react";
import { NewOrderDialog } from "@/components/prodify/NewOrderDialog";

const statuses: (OrderStatus | "Semua")[] = ["Semua", "Waiting", "On Progress", "Assembling", "Ready to Ship", "Done"];

export default function AdminOrders() {
  const { orders } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("Semua");
  const [openNew, setOpenNew] = useState(false);

  const filtered = orders
    .filter((o) => (tab === "Semua" ? true : o.status === tab))
    .filter((o) =>
      [o.code, o.productName, o.customerName].join(" ").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => Number(b.fastTrack) - Number(a.fastTrack));

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Manajemen Pesanan"
        description="Input pesanan custom & ready stock, pecah subtask, assign ke pengrajin."
        actions={
          <Button onClick={() => setOpenNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Pesanan Baru
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari kode, produk, atau pelanggan..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {statuses.map((s) => (
            <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Belum ada pesanan" description="Tambah pesanan baru untuk mulai." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => navigate(`/admin/orders/${o.id}`)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewOrderDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}