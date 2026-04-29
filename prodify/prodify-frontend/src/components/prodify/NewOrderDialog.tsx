import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/store/useStore";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderType } from "@/types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const NewOrderDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { products, orders, addOrder } = useStore();
  const [type, setType] = useState<OrderType>("custom");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [fastTrack, setFastTrack] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const product = products.find((p) => p.id === productId);
  const fastTrackCount = useMemo(
    () => orders.filter((o) => o.fastTrack && o.status !== "Done").length,
    [orders]
  );
  const fastTrackFull = fastTrackCount >= 10;

  const eligibleProducts = type === "ready_stock" ? products.filter((p) => p.stock > 0) : products;

  const reset = () => {
    setType("custom"); setProductId(""); setQuantity(1); setCustomerName("");
    setCustomerPhone(""); setAddress(""); setNotes(""); setFastTrack(false);
  };

  const handleSubmit = () => {
    if (!productId || !customerName || !customerPhone || !address) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    if (type === "ready_stock" && product && quantity > product.stock) {
      toast.error(`Stok tidak cukup. Tersisa ${product.stock}`);
      return;
    }
    addOrder({
      type, productId, quantity, customerName, customerPhone, address, notes,
      fastTrack: fastTrack && !fastTrackFull,
      productName: product!.name,
      deadline: new Date(deadline).toISOString(),
    });
    toast.success("Pesanan berhasil ditambahkan");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pesanan Baru</DialogTitle>
          <DialogDescription>Pilih jenis pesanan dan lengkapi data pelanggan.</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as OrderType); setProductId(""); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="custom">Custom (Make to Order)</TabsTrigger>
            <TabsTrigger value="ready_stock">Ready Stock</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Produk *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
              <SelectContent>
                {eligibleProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.image} {p.name} {type === "ready_stock" && `(stok: ${p.stock})`}
                    {type === "custom" && p.type === "complex" && " — kompleks"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {product && type === "custom" && product.type === "complex" && (
              <p className="text-xs text-muted-foreground">
                Akan dipecah otomatis menjadi {product.parts.length} subtask: {product.parts.map((p) => p.name).join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, +e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nama Pelanggan *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>No. HP *</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Alamat *</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
          {type === "custom" && (
            <div className="space-y-2">
              <Label>Catatan custom</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Warna, ukuran, dll." />
            </div>
          )}

          {type === "custom" && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div>
                <Label className="text-sm font-semibold">Fast Track</Label>
                <p className="text-xs text-muted-foreground">{fastTrackCount}/10 aktif {fastTrackFull && "— penuh"}</p>
              </div>
              <Switch checked={fastTrack} onCheckedChange={setFastTrack} disabled={fastTrackFull} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit}>Simpan Pesanan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};