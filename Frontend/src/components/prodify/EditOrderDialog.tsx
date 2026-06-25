import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/store/useStore";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderType, Product } from "@/types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDER_SOURCES } from "@/lib/orderSources";
import { cn } from "@/lib/utils";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  order: any; // Data pesanan aktif dari tombol titik tiga
}

export const EditOrderDialog = ({ open, onOpenChange, order }: EditOrderDialogProps) => {
  const { products, orders, locations } = useStore();
  const updateOrder = (useStore() as any).updateOrder || (useStore() as any).editOrder;

  const [type, setType] = useState<OrderType>("custom");
  const [productId, setProductId] = useState("");
  
  const [selectedLocationId, setSelectedLocationId] = useState(""); 
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [fastTrack, setFastTrack] = useState(false);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState("");

  // Mengisi ulang form secara otomatis ketika komponen menerima data pesanan (order) baru
  useEffect(() => {
    if (order) {
      setType(order.type || "custom");
      setProductId(order.productId || "");
      setQuantity(order.quantity || 1);
      
      // Deteksi otomatis apakah pesanan ini offline atau online
      const isOffline = order.customerName === "Customer Offline";
      setIsOnlineMode(!isOffline);

      setCustomerName(isOffline ? "" : (order.customerName || ""));
      setCustomerPhone(isOffline ? "" : (order.customerPhone || ""));
      setAddress(isOffline ? "" : (order.address || ""));
      
      setNotes(order.notes || "");
      setFastTrack(!!order.fastTrack);
      setSource(order.source || "");
      if (order.deadline) {
        setDeadline(new Date(order.deadline).toISOString().slice(0, 10));
      }

      // Cari lokasi cabang lama jika tipenya ready_stock
      if (order.type === "ready_stock" && locations) {
        // Ekstrak nama cabang dari notes jika disimpan di sana, atau pakai fallback field jika ada
        const matchedLocation = locations.find((l) => order.notes?.includes(`[Sumber Barang: ${l.name}]`) || l.name === order.locationName);
        if (matchedLocation) {
          setSelectedLocationId(matchedLocation.id);
        } else {
          setSelectedLocationId("");
        }
      } else {
        setSelectedLocationId("");
      }
    }
  }, [order, open, locations]);

  const safeProducts = products || [];
  const safeOrders = orders || [];
  const safeLocations = locations || [];

  const product = safeProducts.find((p) => p.id === productId);

  const getProductTotalStock = (p: Product | undefined): number => {
    if (!p) return 0;
    if (p.stock && typeof p.stock === "object") {
      return Object.values(p.stock as Record<string, number>).reduce((acc, curr) => acc + (curr || 0), 0);
    }
    return typeof p.stock === "number" ? p.stock : 0;
  };

  const locationsWithStockTable = useMemo(() => {
    if (!productId || !product) {
      return [];
    }
    
    const stockObj = (product.stock || {}) as Record<string, number>;
    
    return safeLocations.map((loc) => {
      return {
        id: loc.id,
        name: loc.name,
        stock: Number(stockObj[loc.id]) || 0,
      };
    });
  }, [product, productId, safeLocations]);

  const currentSelectedStock = useMemo(() => {
    const loc = locationsWithStockTable.find(l => l.id === selectedLocationId);
    return loc ? loc.stock : 0;
  }, [selectedLocationId, locationsWithStockTable]);

  const selectedLocationName = useMemo(() => {
    const loc = safeLocations.find(l => l.id === selectedLocationId);
    return loc ? loc.name : "";
  }, [selectedLocationId, safeLocations]);

  const fastTrackCount = useMemo(
    () => safeOrders.filter((o) => o.fastTrack && o.status !== "Selesai" && o.id !== order?.id).length,
    [safeOrders, order]
  );
  const fastTrackFull = fastTrackCount >= 10;

  const eligibleProducts = type === "ready_stock" 
    ? safeProducts.filter((p) => getProductTotalStock(p) > 0 || p.id === order?.productId) 
    : safeProducts;

  const handleSubmit = async () => {
    if (!productId) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }

    if (isOnlineMode && (!customerName || !customerPhone || !address)) {
      toast.error("Lengkapi semua field wajib pelanggan Online");
      return;
    }

    if (type === "ready_stock") {
      if (!selectedLocationId) {
        toast.error("Silakan pilih salah satu cabang toko dari tabel");
        return;
      }
      if (currentSelectedStock <= 0) {
        toast.error(`Stok di cabang "${selectedLocationName}" habis.`);
        return;
      }
      if (quantity > currentSelectedStock) {
        toast.error(`Stok di cabang "${selectedLocationName}" tidak cukup. Tersisa ${currentSelectedStock} pcs`);
        return;
      }
    }

    setLoading(true);

    try {
      // Bersihkan teks tag lokasi lama dari catatan sebelum disimpan ulang
      let cleanNotes = notes;
      if (order?.notes) {
        cleanNotes = notes.replace(/\[Sumber Barang:.*?\]\s*/g, '').trim();
      }

      const finalNotes = type === "ready_stock" && selectedLocationName
        ? `[Sumber Barang: ${selectedLocationName}] ${cleanNotes}`.trim() 
        : cleanNotes;

      if (typeof updateOrder === "function") {
        await updateOrder(order.id, {
          productId,
          quantity,
          isOnline: isOnlineMode,
          customerName: isOnlineMode ? customerName : "Customer Offline",
          customerPhone: isOnlineMode ? customerPhone : "-",
          address: isOnlineMode ? address : "Ambil di Toko",
          notes: finalNotes,
          type,
          fastTrack: fastTrack && !fastTrackFull,
          deadline: new Date(deadline).toISOString(),
          source: source || undefined,
          locationName: type === "ready_stock" ? selectedLocationName : undefined 
        });

        toast.success("Pesanan berhasil diperbarui!");
        onOpenChange(false);
      } else {
        toast.error("Fungsi updateOrder tidak tersedia di store");
      }
    } catch (error: any) {
      console.error("Gagal update pesanan:", error);
      toast.error(error.message || "Gagal memperbarui pesanan. Cek koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] mx-auto my-auto max-h-[85vh] overflow-y-auto bg-white rounded-xl p-5 md:p-6">
        <DialogHeader>
          <DialogTitle>Edit Data Pesanan</DialogTitle>
          <DialogDescription>
            Ubah data formulir pesanan kode <span className="font-mono font-bold text-secondary">{order?.code}</span> di bawah ini.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as OrderType); setProductId(""); setSelectedLocationId(""); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="ready_stock">Ready Stock</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 mt-2">
          {/* KOLOM: PILIHAN PRODUK */}
          <div className="space-y-2">
            <Label>Produk *</Label>
            <Select value={productId} onValueChange={(v) => { setProductId(v); setSelectedLocationId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
              <SelectContent className="bg-white">
                {eligibleProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {type === "custom" && p.type === "complex" && " — kompleks"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TABEL LIST TOKO */}
          {type === "ready_stock" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <Label className="font-semibold text-sm text-black">Pilih Cabang Toko Asal Barang *</Label>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                {/* Header Tabel */}
                <div className="grid grid-cols-2 bg-white px-4 py-2 text-xs font-bold text-black uppercase tracking-wider border-b border-slate-200">
                  <div>Cabang Toko</div>
                  <div className="text-right">Sisa Stok</div>
                </div>
                
                {/* Isi List Tabel */}
                {!productId ? (
                  <div className="p-4 text-center text-sm text-slate-400 italic bg-white">
                    Silakan pilih produk terlebih dahulu untuk melihat toko & stoknya
                  </div>
                ) : locationsWithStockTable.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400 italic bg-white">
                    Data cabang tidak tersedia. Silakan tambahkan toko terlebih dahulu di menu pengaturan.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white">
                    {locationsWithStockTable.map((loc) => {
                      const isSelected = selectedLocationId === loc.id;
                      const isZero = loc.stock === 0;
                      
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            if (!isZero) {
                              setSelectedLocationId(loc.id);
                            } else {
                              toast.error(`Stok di ${loc.name} kosong, pilih cabang lain.`);
                            }
                          }}
                          className={cn(
                            "grid grid-cols-2 px-4 py-3 text-sm cursor-pointer transition-all items-center text-black",
                            isSelected 
                              ? "bg-yellow-500 font-semibold border-l-4 border-yellow-600 pl-3 text-black" 
                              : "hover:bg-slate-50",
                            isZero && "text-slate-400 bg-slate-50/60 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isZero ? "bg-red-400" : "bg-green-500"
                            )} />
                            {loc.name}
                          </div>
                          <div className={cn(
                            "text-right font-semibold",
                            isZero ? "text-red-500 bg-red-50 px-2 py-0.5 rounded-md text-xs inline-block ml-auto" : "text-slate-700"
                          )}>
                            {isZero ? "Habis (0)" : `${loc.stock} pcs`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KOLOM: SUMBER CHANNEL PESANAN */}
          <div className="space-y-2">
            <Label>Sumber Pesanan</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih channel asal pesanan" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {(ORDER_SOURCES || []).map((s) => {
                  const Ic = s.icon;
                  return (
                    <SelectItem key={s.name} value={s.name}>
                      <span className="inline-flex items-center gap-2">
                        <Ic className="h-4 w-4" />
                        {s.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>       

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input 
                type="number" 
                min={1} 
                value={quantity} 
                onChange={(e) => setQuantity(Math.max(1, +e.target.value))} 
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Tenggat</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          {/* PANEL SWITCH TOGGLE MINIMALIS (Warna Teks Hitam & Switch Kuning/Abu) */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
            <span className="text-sm font-bold text-black select-none">
              {isOnlineMode ? "Online" : "Offline"}
            </span>
            <Switch 
              checked={isOnlineMode} 
              onCheckedChange={setIsOnlineMode} 
              className="data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-input"
            />
          </div>

          {/* DYNAMIC FORM FIELD: Muncul merayap turun jika switch aktif (Online) */}
          {isOnlineMode && (
            <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <Label>Nama Pelanggan *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Masukkan nama pelanggan" />
              </div>
              <div className="space-y-2">
                <Label>No. HP *</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>Alamat *</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Alamat pengiriman lengkap..." />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{type === "custom" ? "Catatan custom" : "Catatan Tambahan"}</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={2} 
              placeholder={type === "custom" ? "Warna, ukuran, dll." : "Keterangan opsional untuk pengiriman..."} 
            />
          </div>

          {type === "custom" && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div>
                <Label className="text-sm font-semibold">Prioritas Tinggi</Label>
                <p className="text-xs text-muted-foreground">{fastTrackCount}/10 aktif {fastTrackFull && "— penuh"}</p>
              </div>
              <Switch checked={fastTrack} onCheckedChange={setFastTrack} disabled={fastTrackFull} className="data-[state=checked]:bg-yellow-500" />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="m-0">Batal</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold m-0">
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};