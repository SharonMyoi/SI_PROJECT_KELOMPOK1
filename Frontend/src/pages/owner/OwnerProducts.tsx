import { useState } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Store, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Product } from "@/types";
import { cn, formatRupiah } from "@/lib/utils";

export default function OwnerProducts() {
  const { products, locations, categories } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const stores = locations || [];

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk & Stok Cabang"
        description="Pantau ketersediaan produk jadi pada seluruh cabang toko fisik secara real-time."
      />

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
      </div>

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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3 + stores.length} className="p-12 text-center text-muted-foreground italic bg-slate-50/50">
                    Tidak ada produk yang cocok dengan pencarian atau filter kategori saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
