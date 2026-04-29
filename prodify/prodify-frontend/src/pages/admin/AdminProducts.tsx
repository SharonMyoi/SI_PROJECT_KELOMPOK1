import { useRef, useState } from "react";
import { useStore, formatRupiah } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, Package, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCategory, ProductPart, Specialization } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const allParts: Specialization[] = ["Kepala", "Badan", "Tangan", "Kaki", "Tas", "Gantungan Kunci", "Aksesoris"];

export default function AdminProducts() {
  const { products, addProduct } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Boneka");
  const [image, setImage] = useState<string>("📦");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [basePrice, setBasePrice] = useState(50000);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [parts, setParts] = useState<ProductPart[]>([{ name: "Kepala", point: 4000 }]);

  const isImageUrl = (s: string) => s.startsWith("data:image") || s.startsWith("http") || s.startsWith("/");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const togglePart = (name: Specialization) => {
    setParts((p) =>
      p.some((x) => x.name === name)
        ? p.filter((x) => x.name !== name)
        : [...p, { name, point: 3000 }]
    );
  };

  const setPartPoint = (name: Specialization, point: number) => {
    setParts((p) => p.map((x) => (x.name === name ? { ...x, point } : x)));
  };

  const handleSave = () => {
    if (!name || parts.length === 0) return toast.error("Isi nama dan minimal 1 bagian");
    addProduct({
      name, category, image, basePrice, stock, minStock,
      parts,
      type: parts.length > 1 ? "complex" : "simple",
    });
    toast.success("Produk ditambahkan");
    setOpen(false);
    setName(""); setParts([{ name: "Kepala", point: 4000 }]); setStock(0); setImage("📦");
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Produk & Stok"
        description="Master produk, template subtask, dan jumlah stok ready-to-ship."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Produk Baru</Button>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const low = p.stock <= p.minStock;
          return (
            <Card key={p.id} className="p-5 hover:shadow-[var(--shadow-card)] transition-shadow">
              <div className="flex items-start justify-between gap-3">
                {isImageUrl(p.image) ? (
                  <img src={p.image} alt={p.name} className="h-16 w-16 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="text-5xl">{p.image}</div>
                )}
                {low && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/15 text-destructive text-[11px] font-semibold">
                    <AlertTriangle className="h-3 w-3" /> Menipis
                  </span>
                )}
              </div>
              <h3 className="font-bold text-foreground mt-3">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.category} • {p.type === "complex" ? `${p.parts.length} bagian` : "1 bagian"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Harga</p>
                  <p className="font-semibold text-foreground">{formatRupiah(p.basePrice)}</p>
                </div>
                <div className={cn("p-2 rounded-lg", low ? "bg-destructive/10" : "bg-success/10")}>
                  <p className="text-muted-foreground">Stok</p>
                  <p className={cn("font-semibold", low ? "text-destructive" : "text-success")}>{p.stock} pcs</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.parts.map((part) => (
                  <span key={part.name} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">
                    {part.name} • {formatRupiah(part.point)}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <div className="space-y-2">
                <Label>Gambar</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-24 w-24 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center bg-muted/30 overflow-hidden group"
                >
                  {isImageUrl(image) ? (
                    <>
                      <img src={image} alt="preview" className="h-full w-full object-cover" />
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImage("📦");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary">
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px]">Upload</span>
                    </div>
                  )}
                </button>
              </div>
              <div className="space-y-2">
                <Label>Nama Produk</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Boneka Beruang" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boneka">Boneka</SelectItem>
                    <SelectItem value="Tas">Tas</SelectItem>
                    <SelectItem value="Gantungan Kunci">Gantungan Kunci</SelectItem>
                    <SelectItem value="Aksesoris">Aksesoris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <Input type="number" value={basePrice} onChange={(e) => setBasePrice(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Stok awal</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Min. stok</Label>
                <Input type="number" value={minStock} onChange={(e) => setMinStock(+e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bagian / Subtask & Upah</Label>
              <div className="space-y-1.5 border border-border rounded-lg p-3">
                {allParts.map((sp) => {
                  const part = parts.find((p) => p.name === sp);
                  return (
                    <div key={sp} className="flex items-center gap-3">
                      <input type="checkbox" checked={!!part} onChange={() => togglePart(sp)} className="h-4 w-4 rounded border-border" />
                      <span className="flex-1 text-sm">{sp}</span>
                      {part && (
                        <Input
                          type="number"
                          value={part.point}
                          onChange={(e) => setPartPoint(sp, +e.target.value)}
                          className="w-32 h-8"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{parts.length > 1 ? "Produk kompleks — akan dipecah jadi subtask." : "Produk sederhana — 1 task."}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}