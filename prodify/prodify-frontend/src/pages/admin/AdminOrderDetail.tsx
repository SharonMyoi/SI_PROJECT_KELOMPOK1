import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/prodify/StatusBadge";
import { ArrowLeft, MapPin, Phone, User as UserIcon, Calendar, Zap, Package, FileText, CheckCircle2, Truck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatRupiah } from "@/store/useStore";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, users, products, assignSubtask, finishAssembly, setResi } = useStore();
  const order = orders.find((o) => o.id === id);
  const product = products.find((p) => p.id === order?.productId);
  const [resi, setResiInput] = useState("");

  if (!order) return <div className="p-8">Pesanan tidak ditemukan. <Button onClick={() => navigate(-1)}>Kembali</Button></div>;

  const totalUpah = order.subtasks.reduce((sum, s) => sum + s.point, 0);
  const allDone = order.subtasks.length > 0 && order.subtasks.every((s) => s.status === "Selesai");

  return (
    <div className="space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <PageHeader
        title={`${order.code} — ${order.productName}`}
        description={`Dibuat ${new Date(order.createdAt).toLocaleDateString("id-ID")}`}
        actions={
          <div className="flex items-center gap-2">
            {order.fastTrack && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase">
                <Zap className="h-3 w-3" /> Fast Track
              </span>
            )}
            <StatusBadge status={order.status} />
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h2 className="font-bold text-foreground">Informasi Pelanggan</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> {order.customerName}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {order.customerPhone}</div>
            <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {order.address}</div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Deadline: {new Date(order.deadline).toLocaleDateString("id-ID")}</div>
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> {order.quantity} pcs</div>
            {order.notes && <div className="sm:col-span-2 flex gap-2"><FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="text-muted-foreground">{order.notes}</span></div>}
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground">
          <p className="text-xs uppercase tracking-wider text-secondary-foreground/70 font-semibold">Total Upah Produksi</p>
          <p className="text-3xl font-bold mt-1">{formatRupiah(totalUpah)}</p>
          <p className="text-xs text-secondary-foreground/70 mt-1">{order.subtasks.length} subtask</p>
        </Card>
      </div>

      {order.subtasks.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-foreground mb-4">Subtask & Penugasan</h2>
          <div className="space-y-3">
            {order.subtasks.map((s) => {
              const assignee = users.find((u) => u.id === s.assignedTo);
              const eligible = users.filter(
                (u) => u.role === "pengrajin" && u.specializations?.includes(s.partName)
              );
              return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{s.partName}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Upah: {formatRupiah(s.point)}</p>
                  </div>
                  <div className="sm:w-64">
                    <Select
                      value={s.assignedTo ?? ""}
                      onValueChange={(v) => assignSubtask(order.id, s.id, v)}
                      disabled={s.status === "Selesai"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pengrajin" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligible.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Tidak ada pengrajin dengan spesialisasi ini</div>}
                        {eligible.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignee && <p className="text-[11px] text-muted-foreground mt-1">Ditugaskan ke {assignee.name}</p>}
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
          {order.status === "Assembling" && (
            <Button
              onClick={() => { finishAssembly(order.id); toast.success("Perakitan selesai. Status: Ready to Ship"); }}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Finish Assembly
            </Button>
          )}
          {order.status === "Ready to Ship" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="No. Resi pengiriman" value={resi} onChange={(e) => setResiInput(e.target.value)} />
              <Button
                onClick={() => {
                  if (!resi.trim()) return toast.error("Isi nomor resi");
                  setResi(order.id, resi.trim());
                  toast.success("Resi tersimpan. Pesanan selesai!");
                }}
                className="gap-2 shrink-0"
              >
                <Truck className="h-4 w-4" /> Input Resi & Selesai
              </Button>
            </div>
          )}
          {order.status === "Done" && order.resi && (
            <p className="text-sm text-muted-foreground">Pesanan selesai. Resi: <span className="font-mono font-semibold text-foreground">{order.resi}</span></p>
          )}
          {order.status === "Waiting" && order.subtasks.length > 0 && (
            <p className="text-sm text-muted-foreground">Tugaskan minimal 1 subtask untuk memulai produksi.</p>
          )}
          {order.status === "On Progress" && !allDone && (
            <p className="text-sm text-muted-foreground">Menunggu seluruh subtask selesai untuk masuk tahap perakitan.</p>
          )}
        </div>
      </Card>
    </div>
  );
}