import { useMemo, useState, useEffect } from "react";
// REVISI: Mengeluarkan formatRupiah dari import useStore karena modul tersebut tidak menyediakannya
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Zap, Calendar, AlertTriangle, UserCheck, Sparkles, Brain, ArrowLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import { getRecommendations } from "@/lib/waitingList";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Penugasan() {
  const { orders, users, skills, assignSubtask, bootstrap, getPengrajinStatus } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // State untuk melacak order mana yang sedang dibuka subtask-nya
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // State untuk melacak subtask mana yang aktif dipilih untuk di-assign
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);

  // FUNGSI UTAMA DIREVISI TOTAL: Mengalikan harga subtask.point langsung dengan kuantitas pesanan (qty)
  const getSubtaskPrice = (subtask: any, quantity: number = 1) => {
    if (!subtask) return 0;
    // Ambil upah dasar langsung dari properti subtask (point atau price) sesuai database asli
    const basePoint = subtask.point !== undefined && subtask.point !== null 
      ? subtask.point 
      : (subtask.price || 0);
      
    const finalUnitValue = typeof basePoint === 'string' ? parseFloat(basePoint) || 0 : basePoint;

    // Logika Total Borongan: Harga Per Pcs × Jumlah Pcs Pesanan
    return finalUnitValue * quantity;
  };

  // 1. Ambil semua order yang memiliki subtask yang BELUM di-assign
  const waitingOrders = useMemo(() => {
    if (!orders) return [];
    
    return orders
      .filter(order => {
        if (!order || order.status === "Selesai") return false;
        return (order.subtasks || []).some(st => !st.assignedTo);
      })
      .map(order => {
        const unassignedSubtasks = (order.subtasks || []).filter(st => !st.assignedTo);
        const deadlineDate = new Date(order.deadline);
        const now = new Date();
        const diffTime = deadlineDate.getTime() - now.getTime();
        const daysToDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          order,
          unassignedCount: unassignedSubtasks.length,
          totalCount: (order.subtasks || []).length,
          daysToDeadline
        };
      })
      .sort((a, b) => {
        if (a.order.fastTrack && !b.order.fastTrack) return -1;
        if (!a.order.fastTrack && b.order.fastTrack) return 1;
        return a.daysToDeadline - b.daysToDeadline;
      });
  }, [orders]);

  // Hitung Data untuk Stat Cards
  const totalNormalOrders = useMemo(() => {
    return waitingOrders.filter(w => !w.order.fastTrack).length;
  }, [waitingOrders]);

  const totalFastTrackOrders = useMemo(() => {
    return waitingOrders.filter(w => w.order.fastTrack).length;
  }, [waitingOrders]);

  const totalSubtaskAntrian = useMemo(() => {
    return (orders || []).reduce((acc, order) => {
      if (!order || order.status === "Selesai") return acc;
      return acc + (order.subtasks || []).filter(st => !st.assignedTo).length;
    }, 0);
  }, [orders]);

  // Menghitung custom order yang MASIH AKTIF ADA DI ANTRIAN PENUGASAN
  const customActiveInQueue = useMemo(() => {
    return waitingOrders.filter(w => w.order.source?.toLowerCase().includes("custom")).length;
  }, [waitingOrders]);
  const overload = customActiveInQueue > 10;

  // 2. Jika suatu order dipilih, ambil daftar subtask-nya yang belum di-assign
  const currentSubtasks = useMemo(() => {
    if (!selectedOrderId || !orders) return [];
    const targetOrder = orders.find(o => o.id === selectedOrderId);
    if (!targetOrder) return [];

    return (targetOrder.subtasks || [])
      .filter(st => !st.assignedTo)
      .map(st => {
        const deadlineDate = new Date(targetOrder.deadline);
        const now = new Date();
        const diffTime = deadlineDate.getTime() - now.getTime();
        const daysToDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { order: targetOrder, subtask: st, daysToDeadline };
      });
  }, [selectedOrderId, orders]);

  // Auto-select subtask pertama jika panel subtask terbuka
  useEffect(() => {
    if (currentSubtasks.length > 0) {
      const stillValid = currentSubtasks.some(s => s.subtask.id === selectedSubtaskId);
      if (!stillValid) {
        setSelectedSubtaskId(currentSubtasks[0].subtask.id);
      }
    } else {
      setSelectedSubtaskId(null);
      setSelectedOrderId(null);
    }
  }, [currentSubtasks, selectedSubtaskId]);

  // 3. Cari data subtask + order yang sedang aktif di-klik untuk rekomendasi
  const selectedData = useMemo(() => {
    if (!selectedSubtaskId || !orders) return null;
    
    for (const order of orders) {
      const foundSubtask = (order.subtasks || []).find(st => st.id === selectedSubtaskId);
      if (foundSubtask) {
        const deadlineDate = new Date(order.deadline);
        const now = new Date();
        const diffTime = deadlineDate.getTime() - now.getTime();
        const daysToDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { order, subtask: foundSubtask, daysToDeadline };
      }
    }
    return null;
  }, [selectedSubtaskId, orders]);

  // 4. Hitung rekomendasi pengrajin untuk subtask terpilih
  const recs = useMemo(() => {
    if (!selectedData) return [];
    const activePartName = selectedData.subtask.partName || "";
    return getRecommendations(users, orders, activePartName);
  }, [selectedData, users, orders]);

  const handleAssign = async (userId: string) => {
    if (!selectedData) return;
    setLoading(true);
    try {
      await assignSubtask(selectedData.order.id, selectedData.subtask.id, userId);
      toast.success("Bagian berhasil ditugaskan");
      await bootstrap();
    } catch (error) {
      toast.error("Gagal menugaskan bagian");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penugasan"
        description="Kelola antrian tugas dan Tugaskan bagian secara efisien ke pengrajin terbaik."
      />

      {overload && (
        <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-destructive">Daftar Tunggu Penuh</p>
            <p className="text-sm text-muted-foreground">
              {customActiveInQueue} custom order aktif (batas: 10). Pertimbangkan menambah pengrajin atau menolak order baru.
            </p>
          </div>
        </Card>
      )}

      {/* Empat Stat Cards Atas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-center border-border bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tugas Reguler</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{totalNormalOrders}</p>
        </Card>

        <Card className="p-4 flex flex-col justify-center border-destructive/20 bg-destructive/5">
          <p className="text-xs uppercase tracking-wider text-destructive font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3 fill-destructive text-destructive" /> Tugas Prioritas Tinggi
          </p>
          <p className="text-2xl font-bold mt-1 text-destructive">{totalFastTrackOrders}/10</p>
        </Card>

        <Card className="p-4 flex flex-col justify-center border-border bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Bagian</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{totalSubtaskAntrian}</p>
        </Card>

        <Card className={cn(
          "p-4 flex flex-col justify-center transition-all",
          overload ? "border-destructive bg-destructive/15" : "border-border bg-card"
        )}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Custom Pesanan Aktif</p>
          <p className={cn("text-2xl font-bold mt-1", overload ? "text-destructive" : "text-foreground")}>
            {customActiveInQueue}/10
          </p>
        </Card>
      </div>

      {/* Tata Letak Utama Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* PANEL KIRI */}
        <Card className="p-4 lg:col-span-2 min-h-[35vh] max-h-[68vh] overflow-y-auto flex flex-col space-y-3 order-1">
          {waitingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full my-auto text-center p-6">
              <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-bold text-foreground text-sm">Antrian kosong</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Semua bagian sudah ditugaskan ke pengrajin.
              </p>
            </div>
          ) : !selectedOrderId ? (
            /* ================= VIEW 1: LEVEL TASK / LIST ORDER ================= */
            <>
              <h2 className="font-bold text-foreground text-sm">Pilih Pesanan Antrian ({waitingOrders.length})</h2>
              <div className="space-y-2 pr-1">
                {waitingOrders.map(({ order, unassignedCount, daysToDeadline }) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent/50 transition-all duration-200 flex items-center justify-between gap-2 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-secondary">{order.code}</span>
                        {order.fastTrack && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold uppercase">
                            <Zap className="h-2 w-2" /> FT
                          </span>
                        )}
                        {order.source && (
                          <span className="text-[10px] px-1.5 bg-muted text-muted-foreground rounded-md flex items-center gap-1">
                            <ShoppingBag className="h-2.5 w-2.5" /> {order.source}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold rounded-md">
                          {order.quantity || 0} Pcs
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{order.productName || "Produk Tekstil"}</p>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" /> H-{daysToDeadline}</span>
                        <span className="truncate max-w-[120px] sm:max-w-none">• Pelanggan: {order.customerName || "Pelanggan"}</span>
                        <span className="text-yellow-600 font-medium shrink-0">({unassignedCount} Antrian)</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ================= VIEW 2: LEVEL SUBTASK ================= */
            <>
              <div className="flex items-center gap-2 border-b pb-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-lg"
                  onClick={() => setSelectedOrderId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Kembali ke Order</h2>
                  <p className="text-xs font-bold text-foreground truncate">Subtask: {currentSubtasks[0]?.order.code}</p>
                </div>
              </div>

              <div className="space-y-2 pr-1 pt-1">
                {currentSubtasks.map(({ order, subtask, daysToDeadline }) => {
                  const active = selectedSubtaskId === subtask.id;
                  const daysRed = daysToDeadline <= 1;
                  const daysYellow = daysToDeadline <= 3;
                  
                  return (
                    <button
                      key={subtask.id}
                      onClick={() => setSelectedSubtaskId(subtask.id)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border transition-all duration-200",
                        active 
                          ? "border-yellow-500 bg-yellow-500/5 shadow-sm ring-1 ring-yellow-500" 
                          : cn("border-border hover:bg-accent/50", daysRed ? "border-l-4 border-l-destructive" : daysYellow ? "border-l-4 border-l-warning" : "")
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-secondary">{order.code}</span>
                        {order.fastTrack && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold uppercase tracking-wider">
                            <Zap className="h-2.5 w-2.5" /> FT
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-bold text-foreground mt-2 truncate flex items-center flex-wrap gap-1">
                        {subtask.partName}
                        <span className="text-muted-foreground font-normal text-xs sm:text-sm inline">— {order.productName}</span>
                        <span className="text-yellow-700 font-bold text-[10px] px-1.5 py-0.2 bg-yellow-100/70 border border-yellow-200/60 rounded-md shrink-0">
                          ({order.quantity || 0} Pcs)
                        </span>
                      </p>
                      
                      <div className="flex justify-between items-center mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> H-{daysToDeadline}</span>
                        <span className="font-semibold text-foreground">{formatRupiah(getSubtaskPrice(subtask, order.quantity || 1))}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* PANEL KANAN */}
        <div className="grid grid-cols-1 lg:col-span-3 space-y-4 order-2 w-full min-w-0">
          {selectedData ? (
            <>
              {/* Card Detail Subtask Aktif */}
              <Card className="p-5 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-xs text-yellow-600 font-bold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Bagian Aktif
                </div>
                <h2 className="font-bold text-foreground text-lg sm:text-xl mt-1 break-words flex items-center flex-wrap gap-2">
                  {selectedData.subtask.partName} — {selectedData.order.productName}
                  <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-lg font-bold">
                    {selectedData.order.quantity || 0} Pcs
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  {selectedData.order.code} • Pelanggan: {selectedData.order.customerName} • Total Upah Borongan: {formatRupiah(getSubtaskPrice(selectedData.subtask, selectedData.order.quantity || 1))}
                </p>
              </Card>

              {/* Card Ranking Pengrajin */}
              <Card className="p-5 rounded-2xl w-full min-w-0">
                <h3 className="font-bold text-foreground mb-4 text-base flex items-center gap-2">
                  Ranking Rekomendasi Pengrajin
                </h3>
                
                {recs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Tidak ada pengrajin aktif yang memiliki spesialisasi ini.</p>
                ) : (
                  <div className="space-y-3">
                    {recs.map((r, idx) => {
                      // REVISI LOGIKA UTAMA: Menggunakan getPengrajinStatus dari store pusat
                      const statusInfo = getPengrajinStatus(r.user.id);
                      const isAvailable = statusInfo.status === "Tersedia";

                      const matchColor =
                        r.skillMatch === "high"
                          ? "bg-success/15 text-success"
                          : r.skillMatch === "low"
                          ? "bg-warning/15 text-warning"
                          : "bg-muted text-muted-foreground";

                      const statusLabel = isAvailable ? "Tersedia" : "Sibuk";
                      const statusClass = isAvailable 
                        ? "bg-[#EBF7EE] text-[#1F8B4D]" 
                        : "bg-[#FDECEB] text-[#D9381E]";
                      const dotClass = isAvailable ? "bg-[#27A35C]" : "bg-[#E54834]";

                      return (
                        <div
                          key={r.user.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all w-full min-w-0",
                            idx === 0 && isAvailable
                              ? "border-yellow-500 bg-yellow-500/5"
                              : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                              idx === 0 
                                ? "bg-yellow-500 text-black shadow-sm" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {idx === 0 ? "★" : idx + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground text-sm truncate">{r.user.name}</p>
                              
                              <div className="flex items-center flex-wrap gap-2 mt-1.5 text-[11px]">
                                <span className={cn("px-2 py-0.5 rounded-full font-semibold shrink-0", matchColor)}>
                                  Skill: {r.skillMatch}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full font-normal shrink-0",
                                  isAvailable ? "bg-secondary/15 text-secondary" : "bg-destructive/15 text-destructive"
                                )}>
                                  Kapasitas: {statusInfo.activeTasks}/{statusInfo.maxCapacity}
                                </span>
                                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-normal shadow-sm shrink-0", statusClass)}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
                                  {statusLabel}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            disabled={!isAvailable || loading}
                            onClick={() => handleAssign(r.user.id)}
                            className="w-full sm:w-auto gap-1.5 shrink-0 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl h-9 px-4 text-xs"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Tugaskan
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground border-dashed flex flex-col items-center justify-center h-full min-h-[35vh]">
              <Brain className="h-8 w-8 text-muted-foreground/60 mb-2" />Tugas
              <p className="text-sm font-medium">Silahkan pilih pesanan dan bagian terlebih dahulu pada panel kiri.</p>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}