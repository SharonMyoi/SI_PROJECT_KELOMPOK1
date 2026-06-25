import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/prodify/StatusBadge";
import { ArrowLeft, MapPin, Phone, User as UserIcon, Calendar, Zap, Package, FileText, CheckCircle2, Truck, Tag, AlertTriangle } from "lucide-react";
import { getSourceIcon } from "@/lib/orderSources";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getAvailablePengrajin } from "@/lib/waitingList";

import { formatRupiah, cn } from "@/lib/utils";
import { daysUntil } from "@/store/useStore";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, users, products, assignSubtask, unassignSubtask, finishAssembly, setResi } = useStore();
  const order = orders.find((o) => o.id === id);
  const product = products.find((p) => p.id === order?.productId);
  const [resi, setResiInput] = useState("");

  // State untuk manajemen Kustom Pop-up Konfirmasi UI Lepas Pengrajin
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSubtask, setSelectedSubtask] = useState<{ id: string; partName: string } | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<{ name: string } | null>(null);

  if (!order) return <div className="p-8">Pesanan tidak ditemukan. <Button onClick={() => navigate(-1)}>Kembali</Button></div>;

  // PRINSIP AKSESIBILITAS HARGA: Kalikan total point subtask dengan jumlah pesanan (quantity)
  const totalUpah = order.subtasks.reduce((sum, s) => sum + s.point, 0) * (order.quantity || 1);
  const allDone = order.subtasks.length > 0 && order.subtasks.every((s) => s.status === "Selesai");

  // Handler fungsi kustom untuk aksi eksekusi lepas setelah konfirmasi OK di-klik
  const handleConfirmLepas = async () => {
    if (!selectedSubtask || !order) return;
    try {
      await unassignSubtask(order.id, selectedSubtask.id);
      toast.info(`Tugas ${selectedSubtask.partName} telah dilepas`);
    } catch (err) {
      toast.error("Gagal melepas pengrajin");
    } finally {
      setConfirmOpen(false);
      setSelectedSubtask(null);
      setSelectedAssignee(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <PageHeader
        title={`${order.code} — ${order.productName}`}
        description={`Dibuat ${new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. BADGE READY STOCK */}
            {order.type === "ready_stock" && (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase">
                Ready Stock
              </span>
            )}

            {/* 2. BADGE Prioritas Tinggi */}
            {order.fastTrack && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase">
                <Zap className="h-3 w-3" /> Prioritas Tinggi
              </span>
            )}
            
            {/* 3. STATUS BADGE UTAMA */}
            <StatusBadge status={order.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h2 className="font-bold text-foreground">Informasi Pelanggan</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> {order.customerName}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {order.customerPhone}</div>
            <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="h-4 w-4 text-muted-foreground break-words" /> {order.address}</div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> 
              <span className={cn(
                order.status !== "Selesai" && order.status !== "Siap Kirim" && daysUntil(order.deadline) <= 1 ? "text-destructive font-semibold" : "",
                order.status !== "Selesai" && order.status !== "Siap Kirim" && daysUntil(order.deadline) > 1 && daysUntil(order.deadline) <= 3 ? "text-warning font-semibold" : "",
              )}>
                Tenggat: {new Date(order.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                {order.status !== "Selesai" && order.status !== "Siap Kirim" && (
                  <span className="ml-1">
                    ({daysUntil(order.deadline) > 0 ? `H-${daysUntil(order.deadline)}` : daysUntil(order.deadline) === 0 ? "Hari ini!" : `Telat ${Math.abs(daysUntil(order.deadline))} hari`})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> {order.quantity} pcs</div>
            {order.source && (() => {
              const Ic = getSourceIcon(order.source);
              return (
                <div className="flex items-center gap-2 sm:col-span-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>Sumber:</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                    <Ic className="h-3.5 w-3.5" /> {order.source}
                  </span>
                </div>
              );
            })()}
            {order.notes && <div className="sm:col-span-2 flex gap-2"><FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="text-muted-foreground break-words">{order.notes}</span></div>}
          </div>
        </Card>

        {/* REVISI: Mengubah teks ke atas, rata tengah (text-center), dan nama jadi TOTAL UPAH PRODUKSI */}
        <Card className="p-5 bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground flex flex-col justify-center items-center text-center">
          <p className="text-xs uppercase tracking-wider text-secondary-foreground/70 font-semibold mb-1">Total Upah Produksi</p>
          <p className="text-3xl font-bold">{formatRupiah(totalUpah)}</p>
        </Card>
      </div>

      {order.subtasks.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-foreground mb-4">Subtask & Penugasan</h2>
          <div className="space-y-3">
            {order.subtasks.map((s) => {
              const assignee = users.find((u) => u.id === s.assignedTo);
              const eligible = getAvailablePengrajin(users, orders, s.partName);
              return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{s.partName}</p>
                      <div className="scale-90 origin-left">
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    {/* PRINSIP: Menampilkan total upah subtask terkalikan kuantitas beserta detail harga satuannya */}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upah: <span className="font-medium text-foreground">{formatRupiah(s.point * order.quantity)}</span> <span className="text-[10px]">({formatRupiah(s.point)} / pcs)</span>
                    </p>
                  </div>
                  <div className="w-full sm:w-64 shrink-0">
                    <Select
                      value={s.assignedTo ?? ""}
                      onValueChange={async (v) => {
                        try {
                          await assignSubtask(order.id, s.id, v);
                          toast.success(`Berhasil menugaskan bagian ${s.partName}`);
                        } catch {
                          toast.error("Gagal menugaskan pengrajin");
                        }
                      }}
                      disabled={s.status === "Selesai"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih pengrajin" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignee && !eligible.some((u) => u.id === assignee.id) && (
                          <SelectItem value={assignee.id}>{assignee.name} (saat ini)</SelectItem>
                        )}
                        {eligible.length === 0 && !assignee && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Tidak ada pengrajin tersedia untuk {s.partName}. Bagian masuk Daftar Tunggu.</div>
                        )}
                        {eligible.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignee && (
                      <div className="flex items-center justify-between mt-1 px-0.5">
                        <p className="text-[11px] text-muted-foreground truncate max-w-[70%]">
                          Ditugaskan ke {assignee.name}
                        </p>
                        {s.status !== "Selesai" && (
                          <button
                            onClick={() => {
                              setSelectedSubtask({ id: s.id, partName: s.partName });
                              setSelectedAssignee({ name: assignee.name });
                              setConfirmOpen(true);
                            }}
                            className="text-[11px] text-destructive hover:underline transition-all shrink-0"
                          >
                            Lepas
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-bold text-foreground mb-4">Aksi Admin</h2>
        <div className="space-y-3">
          {order.status === "Penyusunan" && order.isOnline && (
            <Button
              onClick={() => { finishAssembly(order.id); toast.success("Pesanan naik ke Siap Kirim!"); }}
              className="gap-2 w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" /> Selesaikan Penyusunan
            </Button>
          )}
          {order.status === "Penyusunan" && !order.isOnline && (
            <Button
              onClick={() => { finishAssembly(order.id); toast.success("Pesanan selesai!"); }}
              className="gap-2 w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" /> Selesaikan Pesanan
            </Button>
          )}
          {order.status === "Siap Kirim" && order.isOnline && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="No. Resi pengiriman" value={resi} onChange={(e) => setResiInput(e.target.value)} className="w-full" />
              <Button
                onClick={() => {
                  if (!resi.trim()) return toast.error("Isi nomor resi");
                  setResi(order.id, resi.trim());
                  toast.success("Resi tersimpan. Pesanan selesai!");
                }}
                className="gap-2 shrink-0 w-full sm:w-auto"
              >
                <Truck className="h-4 w-4" /> Input Resi & Selesai
              </Button>
            </div>
          )}
          {order.status === "Siap Kirim" && !order.isOnline && (
            <Button
              onClick={() => { finishAssembly(order.id); toast.success("Pesanan selesai!"); }}
              className="gap-2 w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" /> Selesaikan Pesanan
            </Button>
          )}
          {order.status === "Selesai" && order.resi && (
            <p className="text-sm text-muted-foreground">Pesanan selesai. Resi: <span className="font-mono font-semibold text-foreground break-all">{order.resi}</span></p>
          )}
          {order.status === "Antrean" && order.subtasks.length > 0 && (
            <p className="text-sm text-muted-foreground">Tugaskan bagian untuk memulai produksi.</p>
          )}
          {order.status === "Sedang Dikerjakan" && !allDone && (
            <p className="text-sm text-muted-foreground">Menunggu seluruh bagian selesai untuk masuk tahap perakitan.</p>
          )}
        </div>
      </Card>

      {/* ==================== ELEMEN UI KUSTOM POP UP KONFIRMASI MODAL ==================== */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 flex flex-col items-center text-center space-y-4 border border-border shadow-2xl bg-background animate-in zoom-in-95 duration-200">
            
            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-2 w-full">
              <h3 className="text-lg font-bold text-foreground">Konfirmasi Lepas Pengrajin</h3>
              <p className="text-sm text-muted-foreground leading-relaxed px-2">
                Apakah Anda yakin ingin melepas <span className="font-semibold text-foreground">{selectedAssignee?.name}</span> dari pekerjaan bagian <span className="font-semibold text-foreground">{selectedSubtask?.partName}</span>?
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-border w-full">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setConfirmOpen(false); }}
                className="text-xs px-4"
              >
                Batal
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleConfirmLepas}
                className="text-xs font-semibold px-4"
              >
                Ya, Lepas Tugas
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}