import { useMemo, useState } from "react";
// REVISI LOKAL: Mengeluarkan formatRupiah dari import useStore agar tidak crash
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/prodify/EmptyState";
import { Sparkles, Zap, Calendar, UserCheck, Brain } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import { getRecommendations, getWaitingList } from "@/lib/waitingList";
import { toast } from "sonner";

export default function AdminSmartAssign() {
  const { orders, users, assignSubtask } = useStore();
  const waiting = useMemo(() => getWaitingList(orders), [orders]);
  const [selectedId, setSelectedId] = useState<string | null>(waiting[0]?.subtask.id ?? null);

  const selected = waiting.find((w) => w.subtask.id === selectedId) ?? waiting[0];

  const recs = useMemo(
    () => (selected ? getRecommendations(users, orders, selected.subtask.partName) : []),
    [selected, users, orders]
  );

  const handleAssign = (userId: string) => {
    if (!selected) return;
    assignSubtask(selected.order.id, selected.subtask.id, userId);
    toast.success("Bagian ditugaskan");
    const remaining = waiting.filter((w) => w.subtask.id !== selected.subtask.id);
    setSelectedId(remaining[0]?.subtask.id ?? null);
  };

  if (waiting.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Penugasan Cerdas"
          description="Rekomendasi pengrajin terbaik berdasarkan skill match & kapasitas."
        />
        <EmptyState icon={Brain} title="Tidak ada bagian antri" description="Semua bagian sudah ditugaskan." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penugasan Cerdas"
        description="Pilih subtask, sistem akan memberi peringkat pengrajin berdasarkan skill & kapasitas."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1 max-h-[70vh] overflow-y-auto">
          <h2 className="font-bold text-foreground mb-3 text-sm">Antrian Bagian ({waiting.length})</h2>
          <div className="space-y-2">
            {waiting.map(({ order, subtask, daysToDeadline }) => {
              const active = selected?.subtask.id === subtask.id;
              return (
                <button
                  key={subtask.id}
                  onClick={() => setSelectedId(subtask.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold text-secondary">{order.code}</span>
                    {order.fastTrack && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold uppercase">
                        <Zap className="h-2.5 w-2.5" /> FT
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                    {subtask.partName} <span className="text-muted-foreground font-normal">— {order.productName}</span>
                  </p>
                  <p className={cn("text-[11px] flex items-center gap-1 mt-0.5", daysToDeadline <= 1 ? "text-destructive font-semibold" : daysToDeadline <= 3 ? "text-warning font-semibold" : "text-muted-foreground")}>
                    <Calendar className="h-3 w-3" /> H-{daysToDeadline}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <div className="flex items-center gap-2 text-xs text-secondary font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Bagian Aktif
              </div>
              <h2 className="font-bold text-foreground text-lg mt-1">
                {selected.subtask.partName} — {selected.order.productName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selected.order.code} • {selected.order.customerName} • Upah {formatRupiah(selected.subtask.point)}
              </p>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-bold text-foreground mb-3">Ranking Rekomendasi</h3>
            {recs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada pengrajin aktif.</p>
            ) : (
              <div className="space-y-2">
                {recs.map((r, idx) => {
                  const matchColor =
                    r.skillMatch === "high"
                      ? "bg-success/15 text-success"
                      : r.skillMatch === "low"
                      ? "bg-warning/15 text-warning"
                      : "bg-muted text-muted-foreground";
                  return (
                    <div
                      key={r.user.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        idx === 0 && r.capacityOk
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                        idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}>
                        {idx === 0 ? "★" : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{r.user.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1 text-[11px]">
                          <span className={cn("px-2 py-0.5 rounded-full font-semibold", matchColor)}>
                            Skill: {r.skillMatch}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-semibold",
                            r.capacityOk ? "bg-secondary/15 text-secondary" : "bg-destructive/15 text-destructive"
                          )}>
                            Kapasitas: {r.active}/{r.capacity}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                            Skor {r.score}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssign(r.user.id)}
                        disabled={!r.capacityOk}
                        className="gap-1.5 shrink-0"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Tugaskan
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}