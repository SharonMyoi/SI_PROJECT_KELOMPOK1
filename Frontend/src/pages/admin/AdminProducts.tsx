import { useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, Upload, X, Pencil, MoreVertical, Trash2, 
  MapPin, ArrowLeftRight, ShieldAlert, PackagePlus, Search, Store, Filter, Tags
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Product, ProductCategory, ProductPart } from "@/types";
import { toast } from "sonner";
import { cn, formatRupiah } from "@/lib/utils";

interface StoreLocation {
  id: string;
  name: string;
}

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, skills, locations, addLocation, updateLocation, deleteLocation, categories, addCategory, updateCategory, deleteCategory } = useStore();
  // --- STATE FILTRATION & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  // --- STATE SELEKSI CABANG TOKO ---
  const stores = locations || []; 

  const [openStoreModal, setOpenStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  // State konfirmasi hapus cabang toko (Sub-Dialog)
  const [deleteStoreTarget, setDeleteStoreTarget] = useState<StoreLocation | null>(null);
  // --- STATE KATEGORI ---
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<StoreLocation | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<StoreLocation | null>(null);
  // --- STATE MUTASI/PEMINDAHAN STOK ---
  const [openMutationModal, setOpenMutationModal] = useState(false);
  const [mutationProduct, setMutationProduct] = useState("");
  const [mutationFromStore, setMutationFromStore] = useState("");
  const [mutationToStore, setMutationToStore] = useState("");
  const [mutationQty, setMutationQty] = useState<number | "">("");
  // --- STATE UTAMA MODAL FORM PRODUK ---
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Boneka");
  const [image, setImage] = useState<string>("🧸");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [minStock, setMinStock] = useState<number | "">(""); 
  const [parts, setParts] = useState<ProductPart[]>([]);
  const [loading, setLoading] = useState(false);
  // --- STATE INPUT DROPDOWN TOKO & STOK ---
  const [selectedStoreInput, setSelectedStoreInput] = useState<string>("");
  const [formStocks, setFormStocks] = useState<Record<string, number>>({});

  const getProductStockInStore = (product: Product, storeId: string): number => {
    const stockData = (product as any).stock;
    if (stockData && typeof stockData === "object") {
      return stockData[storeId] ?? 0;
    }
    return 0;
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    
    const matchesCategoryDropdown = 
      selectedCategoryFilter === "all" || 
      p.category.toLowerCase() === selectedCategoryFilter.toLowerCase();

    const matchesSearchInput = 
      p.name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query);

    return matchesCategoryDropdown && matchesSearchInput;
  });

  const isImageUrl = (s: string) => s.startsWith("data:image") || s.startsWith("http") || s.startsWith("/");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // REVISI AMAN: Menghilangkan parameter defaultPrice yang ghaib agar patuh pada model MasterSkill baru
  const togglePart = (partName: string) => {
    setParts((p) =>
      p.some((x) => x.name === partName)
        ? p.filter((x) => x.name !== partName)
        : [...p, { name: partName as any, point: 0 }] // Default upah awal diset ke 0
    );
  };

  const handlePartPointChange = (partName: string, value: string) => {
    const numericValue = value === "" ? 0 : parseInt(value, 10) || 0;
    setParts((prev) =>
      prev.map((p) => (p.name === partName ? { ...p, point: numericValue } : p))
    );
  };

  const handleLiveStockChange = (val: string) => {
    if (!selectedStoreInput) return;
    const parsed = val === "" ? 0 : parseInt(val, 10);
    setFormStocks(prev => ({
      ...prev,
      [selectedStoreInput]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const resetForm = () => {
    setName(""); 
    setCategory("Boneka"); 
    setImage("🧸"); 
    setBasePrice(""); 
    setMinStock(5); 
    setParts([]); 
    setEditing(null);
    setSelectedStoreInput("");
    const initialStocks: Record<string, number> = {};
    stores.forEach(s => { initialStocks[s.id] = 0; });
    setFormStocks(initialStocks);
  };

  const openAdd = () => { resetForm(); if (stores.length > 0) setSelectedStoreInput(stores[0].id); setOpen(true); };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name); 
    setCategory(p.category); 
    setImage(p.image);
    setBasePrice(p.basePrice ? p.basePrice : "");
    setMinStock(p.minStock ? p.minStock : "");
    setParts([...p.parts]);

    const currentStocks: Record<string, number> = {};
    stores.forEach(s => {
      currentStocks[s.id] = getProductStockInStore(p, s.id);
    });
    setFormStocks(currentStocks);
    
    setSelectedStoreInput(stores[0]?.id || "");
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await deleteProduct(deleteTarget.id);
      toast.success("Produk berhasil dihapus dari database");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Gagal menghapus produk");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || parts.length === 0) return toast.error("Isi nama dan minimal 1 bagian");
    setLoading(true);
    
    const finalBasePrice = basePrice === "" ? 0 : basePrice;
    const finalMinStock = minStock === "" ? 0 : minStock;

    try {
      if (editing) {
        await updateProduct(editing.id, { 
          name, category, image, 
          basePrice: finalBasePrice, 
          minStock: finalMinStock, 
          parts,
          stock: formStocks 
        } as any);
        toast.success("Perubahan data produk & stok cabang berhasil disimpan");
      } else {
        await addProduct({
          name, category, image, 
          basePrice: finalBasePrice, 
          stock: formStocks, 
          minStock: finalMinStock, 
          parts,
          type: parts.length > 1 ? "complex" : "simple",
        } as any);
        toast.success("Produk baru berhasil ditambahkan ke database");
      }
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan data ke database");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async () => {
    const inputName = newStoreName.trim();
    if (!inputName) return toast.error("Nama toko tidak boleh kosong");

    const isDuplicate = stores.some(
      (s) => s.name.toLowerCase() === inputName.toLowerCase() && (editingStore ? s.id !== editingStore.id : true)
    );
    if (isDuplicate) {
      return toast.error("Nama lokasi cabang sudah terdaftar!");
    }

    if (editingStore) {
      const res = await updateLocation(editingStore.id, inputName);
      if (res.ok) {
        toast.success("Nama cabang toko berhasil diperbarui");
      } else {
        toast.error(res.message || "Gagal memperbarui nama cabang");
      }
    } else {
      const res = await addLocation(inputName);
      if (res.ok) {
        toast.success("Cabang baru berhasil terdaftar di database");
      } else {
        toast.error(res.message || "Gagal mendaftarkan cabang baru");
      }
    }
    setNewStoreName("");
    setEditingStore(null);
  };

  const handleDeleteStore = async (id: string) => {
    const res = await deleteLocation(id);
    if (res.ok) {
      toast.success("Lokasi cabang berhasil dihapus dari database");
    } else {
      toast.error(res.message || "Gagal menghapus cabang");
    }
    setDeleteStoreTarget(null);
  };

  const handleSaveCategory = async () => {
    const inputName = newCategoryName.trim();
    if (!inputName) return toast.error("Nama kategori tidak boleh kosong");

    if (editingCategory) {
      const res = await updateCategory(editingCategory.id, inputName);
      if (res.ok) {
        toast.success("Nama kategori berhasil diperbarui");
      } else {
        toast.error(res.message || "Gagal memperbarui kategori");
      }
    } else {
      const res = await addCategory(inputName);
      if (res.ok) {
        toast.success("Kategori baru berhasil ditambahkan");
      } else {
        toast.error(res.message || "Gagal menambahkan kategori");
      }
    }
    setNewCategoryName("");
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await deleteCategory(id);
    if (res.ok) {
      toast.success("Kategori berhasil dihapus dari database");
    } else {
      toast.error(res.message || "Gagal menghapus kategori");
    }
    setDeleteCategoryTarget(null);
  };

  const handleExecuteMutation = async () => {
    if (!mutationProduct || !mutationFromStore || !mutationToStore || !mutationQty) {
      return toast.error("Mohon lengkapi seluruh kolom form mutasi");
    }
    if (mutationFromStore === mutationToStore) {
      return toast.error("Toko asal dan toko tujuan tidak boleh sama");
    }

    const targetProd = products.find(p => p.id === mutationProduct);
    if (!targetProd) return;

    const currentStockFrom = getProductStockInStore(targetProd, mutationFromStore);
    if (currentStockFrom < mutationQty) {
      const storeName = stores.find(s => s.id === mutationFromStore)?.name || "Asal";
      return toast.error(`Stok di ${storeName} kurang! (Tersedia: ${currentStockFrom} pcs)`);
    }

    const currentStockObj = (targetProd as any).stock && typeof (targetProd as any).stock === "object" 
      ? { ...(targetProd as any).stock } 
      : {};
    const updatedStock: Record<string, number> = { ...currentStockObj };
      
    updatedStock[mutationFromStore] = currentStockFrom - mutationQty;
    updatedStock[mutationToStore] = (updatedStock[mutationToStore] ?? 0) + mutationQty;
    try {
      await updateProduct(targetProd.id, {
        ...targetProd,
        stock: updatedStock
      } as any);
      const destName = stores.find(s => s.id === mutationToStore)?.name || "Tujuan";
      toast.success(`Berhasil memindahkan ${mutationQty} pcs ke ${destName}`);
      setOpenMutationModal(false);
      setMutationQty("");
    } catch (e) {
      toast.error("Gagal memproses mutasi");
    }
  };

  const getSelectedStoreName = () => {
    return stores.find(s => s.id === selectedStoreInput)?.name || "";
  };

  const getSelectedStoreStockValue = () => {
    if (!selectedStoreInput) return "";
    const currentVal = formStocks[selectedStoreInput];
    return currentVal === 0 ? "" : currentVal;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriks Produk & Stok Cabang"
        description="Pantau, tambah, dan sesuaikan ketersediaan produk jadi pada seluruh cabang toko fisik Anda secara real-time."
      />

      {/* --- BOX CONTAINER CONTROLLER SEARCH BAR & FILTER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-background shadow-sm sticky top-0 z-10 mt-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari nama produk atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 pr-12 rounded-xl border border-border bg-white focus-visible:ring-yellow-500 w-full text-sm"
          />
          
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground transition-colors",
                    selectedCategoryFilter !== "all" && "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-md border-border w-44">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saring Kategori</div>
                <DropdownMenuItem onClick={() => setSelectedCategoryFilter("all")} className={cn("text-xs cursor-pointer font-medium", selectedCategoryFilter === "all" && "bg-muted font-bold text-yellow-600")}>
                  Semua Kategori
                </DropdownMenuItem>
                {categories.map(cat => (
                  <DropdownMenuItem key={cat.id} onClick={() => setSelectedCategoryFilter(cat.name)} className={cn("text-xs cursor-pointer font-medium", selectedCategoryFilter === cat.name && "bg-muted font-bold text-yellow-600")}>
                    {cat.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
          <Button 
            onClick={() => setOpenMutationModal(true)}
            variant="outline"
            className="h-10 gap-2 border border-border bg-white hover:bg-muted/20 font-semibold text-foreground rounded-xl text-xs px-4"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" /> Mutasi Stok
          </Button>

          <Button 
            onClick={() => setOpenStoreModal(true)}
            variant="outline"
            className="h-10 gap-2 border border-border bg-white hover:bg-muted/20 font-semibold text-foreground rounded-xl text-xs px-4"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Kelola Lokasi Toko
          </Button>

          <Button 
            onClick={() => setOpenCategoryModal(true)}
            variant="outline"
            className="h-10 gap-2 border border-border bg-white hover:bg-muted/20 font-semibold text-foreground rounded-xl text-xs px-4"
          >
            <Tags className="h-3.5 w-3.5 text-muted-foreground" /> Kelola Kategori
          </Button>

          <Button 
            onClick={openAdd} 
            className="h-10 gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl text-xs px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Produk Baru
          </Button>
        </div>
      </div>

      {/* --- TABEL PRODUK --- */}
      <Card className="overflow-hidden border border-border/60 rounded-2xl shadow-md bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs text-muted-foreground font-bold tracking-wide uppercase">
                <th className="p-4 pl-5 whitespace-nowrap">Nama Produk Jadi</th>
                <th className="p-4 whitespace-nowrap">Kategori</th>
                <th className="p-4 whitespace-nowrap">Harga Jual</th>
                {stores.map(st => (
                  <th key={st.id} className="p-4 text-center whitespace-nowrap bg-muted/20 font-semibold border-x border-border/30">
                    <div className="flex items-center justify-center gap-1.5 text-foreground/80 text-[11px]">
                      <Store className="h-3 w-3 text-muted-foreground" /> {st.name}
                    </div>
                  </th>
                ))}
                <th className="p-4 text-center pr-5 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-yellow-500/[0.04] transition-all duration-200">
                    <td className="p-4 pl-5 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {isImageUrl(p.image) ? (
                          <img src={p.image} alt={p.name} className="h-10 w-10 rounded-xl object-cover border border-border shadow-sm bg-white shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl border flex items-center justify-center bg-slate-50 text-xl shrink-0 shadow-sm">{p.image}</div>
                        )}
                        <div>
                          <span className="block font-bold text-slate-900">{p.name}</span>
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block mt-0.5">
                            {p.parts?.length || 0} Bagian
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 rounded-full text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                      {formatRupiah(p.basePrice)}
                    </td>
                    {stores.map(st => {
                      const currentStock = getProductStockInStore(p, st.id);
                      const isZero = currentStock === 0;
                      return (
                        <td key={st.id} className="p-4 text-center border-x border-border/20 font-bold whitespace-nowrap text-xs">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full bg-slate-100 font-semibold",
                            isZero ? "text-red-600" : "text-emerald-600"
                          )}>
                            {currentStock} pcs
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-4 text-center pr-5 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-border hover:bg-white shadow-none">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-border">
                          <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2 cursor-pointer font-medium text-xs">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit & Restock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(p)} className="gap-2 cursor-pointer text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/5">
                            <Trash2 className="h-3.5 w-3.5" /> Hapus Produk
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4 + stores.length} className="p-12 text-center text-muted-foreground italic bg-slate-50/50">
                    Tidak ada produk yang cocok dengan pencarian atau filter kategori saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- DIALOG MODAL: TAMBAH / EDIT PRODUK --- */}
      <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) { setOpen(o); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-3xl gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold">
              {editing ? "Edit & Restock Produk" : "Tambah Produk Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 pb-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-3 gap-4 items-end pt-1">
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold">Gambar</Label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="relative h-24 w-full rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-yellow-500 transition-colors flex items-center justify-center bg-muted/10 overflow-hidden group" >
                  {isImageUrl(image) ? (
                    <>
                      <img src={image} alt="preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X className="text-white h-5 w-5" onClick={(e) => { e.stopPropagation(); setImage("🧸"); }} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px]">Upload</span>
                    </div>
                  )}
                </button>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold">Nama Produk</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Boneka Beruang" className="h-11 bg-muted/5 rounded-xl border-muted-foreground/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Kategori</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                  <SelectTrigger className="h-11 rounded-xl bg-muted/5 border-muted-foreground/20"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">Harga Jual</Label>
                <Input type="number" placeholder="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value === "" ? "" : Number(e.target.value))} className="h-11 rounded-xl bg-muted/5 border-muted-foreground/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
            </div>

            {/* --- ATUR STOK CABANG --- */}
            <div className="space-y-2 p-4 rounded-2xl border border-muted-foreground/15 bg-muted/5">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <PackagePlus className="h-4 w-4 text-yellow-500" /> Atur Jumlah Stok Cabang
              </Label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-semibold">Pilih Lokasi Cabang</Label>
                  <Select value={selectedStoreInput} onValueChange={setSelectedStoreInput}>
                    <SelectTrigger className="h-11 rounded-xl bg-white border-muted-foreground/20 text-xs">
                      <SelectValue placeholder="-- Pilih Cabang --" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-semibold">
                    Jumlah Barang {selectedStoreInput ? `(${getSelectedStoreName()})` : ""}
                  </Label>
                  <div className="relative">
                    <Input type="number" min={0} disabled={!selectedStoreInput} placeholder="0" value={getSelectedStoreStockValue()} onChange={(e) => handleLiveStockChange(e.target.value)} onBlur={(e) => { if (e.target.value === "" && selectedStoreInput) { setFormStocks(prev => ({ ...prev, [selectedStoreInput]: 0 })); } }} className="h-11 rounded-xl bg-white border-muted-foreground/20 pr-10 text-left font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">pcs</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Kondisi Stok Menipis (Pcs)</Label>
                <Input type="number" placeholder="5" value={minStock} onChange={(e) => setMinStock(e.target.value === "" ? "" : Number(e.target.value))} className="h-11 rounded-xl bg-muted/5 border-muted-foreground/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
            </div>

            {/* --- REVISI TOTAL UTAMA: LOOPING MENGGUNAKAN MASTER SKILL AGAR KOTAK PILIHAN SELALU MUNCUL --- */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Konfigurasi Nilai Upah Bagian</Label>
              <div className="space-y-2 border border-muted-foreground/20 rounded-xl p-4 max-h-44 overflow-y-auto bg-white">
                {skills.map((skill) => {
                  const isChecked = parts.some((p) => p.name === skill.name);
                  const currentPoint = parts.find((p) => p.name === skill.name)?.point ?? "";

                  return (
                    <div key={skill.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center space-y-0 gap-2">
                        <input 
                          type="checkbox" 
                          id={`part-${skill.id}`} 
                          checked={isChecked} 
                          onChange={() => togglePart(skill.name)} 
                          className="h-4 w-4 rounded text-yellow-500 focus:ring-yellow-500 border-muted-foreground/30" 
                        />
                        <Label htmlFor={`part-${skill.id}`} className="text-xs font-medium cursor-pointer">{skill.name}</Label>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-1.5 w-24">
                          <span className="text-[11px] text-muted-foreground">Rp</span>
                          <Input 
                            type="number" 
                            value={currentPoint} 
                            onChange={(e) => handlePartPointChange(skill.name, e.target.value)} 
                            className="h-7 text-xs px-1.5 font-bold rounded-lg text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t border-border flex flex-row items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl h-11 font-medium">Batal</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl h-11 shadow-sm transition-all px-6">
              {loading ? "Menyimpan..." : "Simpan Produk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG MODAL: KELOLA LOKASI TOKO --- */}
      <Dialog open={openStoreModal} onOpenChange={(o) => { if (!o) setOpenStoreModal(o); }}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Kelola Lokasi Cabang Toko</DialogTitle>
            <DialogDescription className="text-xs">Daftarkan atau hapus hak akses penempatan penampung inventaris logistik cabang.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-bold">Nama Cabang Baru / Edit</Label>
                <Input value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="Contoh: Toko Cimindi" className="h-10 rounded-xl border-muted-foreground/20" />
              </div>
              <Button onClick={handleSaveStore} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-10 rounded-xl px-4">
                {editingStore ? "Update" : "Tambah"}
              </Button>
            </div>
            <div className="border border-border rounded-xl divide-y bg-slate-50/50 max-h-52 overflow-y-auto">
              {stores.map(st => (
                <div key={st.id} className="flex items-center justify-between p-3 bg-white">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" /> {st.name}
                  </span>
                  <div className="flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-border hover:bg-white shadow-none">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl shadow-md border-border">
                        <DropdownMenuItem onClick={() => { setEditingStore(st); setNewStoreName(st.name); }} className="gap-2 cursor-pointer font-medium text-xs">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit Nama
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteStoreTarget(st)} className="gap-2 cursor-pointer text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/5">
                          <Trash2 className="h-3.5 w-3.5" /> Hapus Cabang
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setOpenStoreModal(false); setNewStoreName(""); setEditingStore(null); }} className="w-full rounded-xl h-10">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG MODAL: KONFIRMASI HAPUS CABANG TOKO --- */}
      <Dialog open={!!deleteStoreTarget} onOpenChange={(o) => { if (!o) setDeleteStoreTarget(null); }}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Hapus Cabang?</DialogTitle>
            <DialogDescription className="text-center text-sm pt-1">
              Apakah Anda benar ingin menghapus cabang <span className="font-bold text-foreground">"{deleteStoreTarget?.name}"</span>? Seluruh data matriks stok di toko ini tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteStoreTarget(null)} className="flex-1 rounded-xl h-10 font-medium">Batal</Button>
            <Button variant="destructive" onClick={() => deleteStoreTarget && handleDeleteStore(deleteStoreTarget.id)} className="flex-1 rounded-xl h-10 font-semibold">Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG MODAL: KELOLA KATEGORI --- */}
      <Dialog open={openCategoryModal} onOpenChange={(o) => { if (!o) { setOpenCategoryModal(o); setNewCategoryName(""); setEditingCategory(null); } }}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Kelola Kategori Produk</DialogTitle>
            <DialogDescription className="text-xs">Kelola daftar kategori yang tersedia untuk produk jadi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-bold">Nama Kategori Baru / Edit</Label>
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Contoh: Boneka" className="h-10 rounded-xl border-muted-foreground/20" onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()} />
              </div>
              <Button onClick={handleSaveCategory} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-10 rounded-xl px-4">
                {editingCategory ? "Update" : "Tambah"}
              </Button>
            </div>
            <div className="border border-border rounded-xl divide-y bg-slate-50/50 max-h-52 overflow-y-auto">
              {categories.length > 0 ? categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tags className="h-3.5 w-3.5 text-muted-foreground" /> {cat.name}
                  </span>
                  <div className="flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-border hover:bg-white shadow-none">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl shadow-md border-border">
                        <DropdownMenuItem onClick={() => { setEditingCategory({ id: cat.id, name: cat.name }); setNewCategoryName(cat.name); }} className="gap-2 cursor-pointer font-medium text-xs">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit Nama
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteCategoryTarget({ id: cat.id, name: cat.name })} className="gap-2 cursor-pointer text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/5">
                          <Trash2 className="h-3.5 w-3.5" /> Hapus Kategori
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )) : (
                <div className="p-4 text-center text-xs text-muted-foreground italic">Belum ada kategori.</div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setOpenCategoryModal(false); setNewCategoryName(""); setEditingCategory(null); }} className="w-full rounded-xl h-10">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG MODAL: KONFIRMASI HAPUS KATEGORI --- */}
      <Dialog open={!!deleteCategoryTarget} onOpenChange={(o) => { if (!o) setDeleteCategoryTarget(null); }}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Hapus Kategori?</DialogTitle>
            <DialogDescription className="text-center text-sm pt-1">
              Apakah Anda benar ingin menghapus kategori <span className="font-bold text-foreground">"{deleteCategoryTarget?.name}"</span>? Kategori ini akan dihapus dari daftar pilihan produk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteCategoryTarget(null)} className="flex-1 rounded-xl h-10 font-medium">Batal</Button>
            <Button variant="destructive" onClick={() => deleteCategoryTarget && handleDeleteCategory(deleteCategoryTarget.id)} className="flex-1 rounded-xl h-10 font-semibold">Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG MODAL: MUTASI STOK --- */}
      <Dialog open={openMutationModal} onOpenChange={(o) => { if (!o) setOpenMutationModal(o); }}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Form Mutasi / Perpindahan Barang</DialogTitle>
            <DialogDescription className="text-xs">Lakukan pemindahan alokasi kuantitas stock barang antar gudang cabang toko fisik.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">1. Pilih Produk Jadi</Label>
              <Select value={mutationProduct} onValueChange={setMutationProduct}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-muted-foreground/20 text-xs">
                  <SelectValue placeholder="-- Pilih Produk Jadi --" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} ({p.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">2. Dari Lokasi (Asal)</Label>
                <Select value={mutationFromStore} onValueChange={setMutationFromStore}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-muted-foreground/20 text-xs">
                    <SelectValue placeholder="Pilih Asal" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">3. Ke Lokasi (Tujuan)</Label>
                <Select value={mutationToStore} onValueChange={setMutationToStore}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-muted-foreground/20 text-xs">
                    <SelectValue placeholder="Pilih Tujuan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">4. Jumlah yang Dipindahkan</Label>
              <div className="relative">
                <Input type="number" min={1} placeholder="0" value={mutationQty} onChange={(e) => setMutationQty(e.target.value === "" ? "" : Number(e.target.value))} className="h-11 rounded-xl bg-white border-muted-foreground/20 pr-12 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">pcs</span>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2 flex flex-row gap-2">
            <Button variant="ghost" onClick={() => { setOpenMutationModal(false); setMutationQty(""); }} className="flex-1 rounded-xl h-11 font-medium">Batal</Button>
            <Button onClick={handleExecuteMutation} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl h-11 shadow-sm transition-all">
              Proses Mutasi Barang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG MODAL: CONFIRM HAPUS PRODUK --- */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Hapus Produk Permanen?</DialogTitle>
            <DialogDescription className="text-center text-sm pt-1">
              Anda akan menghapus data <span className="font-bold text-foreground">"{deleteTarget?.name}"</span>. Seluruh histori data matriks akan ikut terhapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl h-10 font-medium">Batal</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading} className="flex-1 rounded-xl h-10 font-semibold">Ya, Hapus Permanen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
