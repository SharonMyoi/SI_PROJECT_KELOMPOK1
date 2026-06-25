import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { OrderCard } from "@/components/prodify/OrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ClipboardList, MoreVertical, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderStatus } from "@/types";
import { EmptyState } from "@/components/prodify/EmptyState";
import { NewOrderDialog } from "@/components/prodify/NewOrderDialog";
import { EditOrderDialog } from "@/components/prodify/EditOrderDialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_SOURCES } from "@/lib/orderSources";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statuses: (OrderStatus | "Semua")[] = ["Semua", "Antrean", "Sedang Dikerjakan", "Penyusunan", "Siap Kirim", "Selesai"];

// REVISI WARNA: Menggunakan kombinasi warna persis dari gambar di atas
const getTabActiveColor = (status: string) => {
  switch (status) {
    case "Antrean":
      return "data-[state=active]:bg-[#fefce8] data-[state=active]:text-[#CA8A04] data-[state=active]:border-[#fef08a] border border-transparent";
    case "Sedang Dikerjakan":
      return "data-[state=active]:bg-[#eff6ff] data-[state=active]:text-[#2563EB] data-[state=active]:border-[#bfdbfe] border border-transparent";
    case "Penyusunan":
      return "data-[state=active]:bg-[#faf5ff] data-[state=active]:text-[#7c3aed] data-[state=active]:border-[#f3e8ff] border border-transparent";
    case "Siap Kirim":
      return "data-[state=active]:bg-[#fff7ed] data-[state=active]:text-[#ea580c] data-[state=active]:border-[#ffedd5] border border-transparent";
    case "Selesai":
      return "data-[state=active]:bg-[#ecfdf5] data-[state=active]:text-[#059669] data-[state=active]:border-[#a7f3d0] border border-transparent";
    default: 
      // Semua (Slate Gelap)
      return "data-[state=active]:bg-[#1e293b] data-[state=active]:text-white border border-transparent";
  }
};

export default function AdminOrders() {
  const store = useStore();
  const orders = store.orders;
  const deleteOrder = (store as any).deleteOrder || (store as any).removeOrder;

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("Semua");
  
  const [filterSumber, setFilterSumber] = useState<string>("Semua");
  const [filterKategoriProduk, setFilterKategoriProduk] = useState<string>("Semua");
  const [filterKategori, setFilterKategori] = useState<string>("Semua");

  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      if (typeof deleteOrder === "function") {
        await deleteOrder(orderToDelete.id);
        toast.success("Pesanan berhasil dihapus");
        setOrderToDelete(null);
      } else {
        toast.error("Fungsi hapus tidak ditemukan di store");
      }
    } catch (error) {
      toast.error("Gagal menghapus pesanan");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order); 
    setOpenEdit(true);
  };

  const filtered = useMemo(() => {
    return (orders || [])
      .filter((o) => (tab === "Semua" ? true : o.status === tab))
      .filter((o) => {
        if (filterSumber === "Semua") return true;
        return o.source?.toLowerCase() === filterSumber.toLowerCase();
      })
      .filter((o) => {
        if (filterKategoriProduk !== "Semua") {
          const prod = store.products.find((p) => p.id === o.productId);
          if (prod?.category !== filterKategoriProduk) return false;
        }
        return true;
      })
      .filter((o) => {
        if (filterKategori === "Semua") return true;
        if (filterKategori === "ready_stock") return o.type === "ready_stock";
        if (filterKategori === "custom") return o.type !== "ready_stock";
        return true;
      })
      .filter((o) =>
        [o.code, o.productName, o.customerName].join(" ").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => Number(b.fastTrack) - Number(a.fastTrack));
  }, [orders, tab, search, filterSumber, filterKategoriProduk, filterKategori, store.products]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manajemen Pesanan"
        description="Input pesanan custom & ready stock, pecah bagian, tugaskan ke pengrajin."
      />

      <Card className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card sticky top-0 z-10 mt-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 w-full">
          <div className="relative w-full md:max-w-xs xl:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode, produk, atau pelanggan..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full md:w-44 shrink-0">
            <Select value={filterSumber} onValueChange={setFilterSumber}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Sumber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Sumber</SelectItem>
                {ORDER_SOURCES.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-44 shrink-0">
            <Select value={filterKategoriProduk} onValueChange={setFilterKategoriProduk}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Produk</SelectItem>
                {[...new Set(store.products.map((p) => p.category).filter(Boolean))].sort().map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-44 shrink-0">
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Kategori</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="ready_stock">Ready Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button onClick={() => setOpenNew(true)} className="gap-2 h-9 text-xs w-full xl:w-auto shrink-0 font-bold">
          <Plus className="h-4 w-4" /> Pesanan Baru
        </Button>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 gap-1 bg-muted p-1 rounded-xl h-auto select-none">
          {statuses.map((s) => (
            <TabsTrigger 
              key={s} 
              value={s} 
              className={cn(
                "w-full px-2 py-2 text-[11px] sm:text-xs md:text-sm font-semibold transition-all duration-200 rounded-lg text-center text-muted-foreground data-[state=active]:shadow-sm data-[state=active]:scale-[1.01]",
                getTabActiveColor(s)
              )}
            >
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada pesanan"
              description="Tidak ada data pesanan yang cocok dengan kriteria pencarian atau filter Anda."
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
              {filtered.map((o) => (
                <div key={o.id} className="relative custom-order-wrapper h-full flex flex-col">
                  
                  <OrderCard
                    order={o}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                  />

                  <div className="absolute top-3.5 right-1 z-30">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="link"
                          size="icon"
                          className="h-5 w-5 p-0 bg-transparent hover:bg-transparent text-gray-400 hover:text-gray-700 shadow-none border-none outline-none focus:ring-0 focus:bg-transparent active:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 bg-white">
                        <DropdownMenuItem
                          onClick={(e) => handleEditClick(o, e)}
                          className="gap-2 text-sm cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit Pesanan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderToDelete(o); 
                          }}
                          className="gap-2 text-sm text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewOrderDialog open={openNew} onOpenChange={setOpenNew} />
      <EditOrderDialog open={openEdit} onOpenChange={setOpenEdit} order={selectedOrder} />

      <AlertDialog open={orderToDelete !== null} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="max-w-[340px] sm:max-w-[360px] w-[calc(100%-2.5rem)] mx-auto my-auto rounded-xl border border-border p-5 shadow-lg backdrop-blur-sm">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="p-2.5 rounded-full bg-destructive/10 text-destructive w-max mx-auto">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground w-full text-center tracking-tight">
              Hapus Pesanan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed w-full text-center pt-0.5 px-1">
              Apakah Anda yakin ingin menghapus pesanan{" "}
              <span className="font-mono font-bold text-secondary">{orderToDelete?.code}</span>?
              Tindakan ini permanen dan subtask didalamnya akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-5 flex flex-row items-center justify-center w-full">
            <AlertDialogCancel className="h-8.5 text-xs rounded-lg border-border hover:bg-muted px-3 flex-1 m-0">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="h-8.5 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 px-3 flex-1 flex items-center justify-center m-0 font-medium"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}