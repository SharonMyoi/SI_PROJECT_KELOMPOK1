import { useStore, formatRupiah, daysUntil } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/prodify/StatusBadge";
import { CheckCircle2, Calendar, MapPin, FileText, Zap } from "lucide-react";
import { EmptyState } from "@/components/prodify/EmptyState";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PengrajinTasks() {
  const { currentUser, orders, finishSubtask } = useStore();
  if (!currentUser) return null;

  const myTasks = orders
    .flatMap((o) =>
      o.subtasks
        .filter((s) => s.assignedTo === currentUser.id && s.status !== "Selesai")
        .map((s) => ({ ...s, order: o }))
    )
    .sort((a, b) => Number(b.order.fastTrack) - Number(a.order.fastTrack));

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`Halo, ${currentUser.name.split(" ")[0]} 👋`}
        description="Berikut task rajut yang ditugaskan kepada Anda."
      />

      {myTasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="Tidak ada task aktif" description="Semua tugas Anda sudah selesai. Terima kasih!" />
      ) : (
        <div className="space-y-3">
          {myTasks.map((t) => {
            const days = daysUntil(t.order.deadline);
            const urgent = days <= 5;
            return (
              <Card key={t.id} className={cn(
                "p-4 sm:p-5",
                urgent && (t.order.fastTrack ? "border-l-4 border-l-destructive" : "border-l-4 border-l-warning")
              )}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-xs font-semibold text-secondary">{t.order.code}</p>
                      {t.order.fastTrack && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase">
                          <Zap className="h-3 w-3" /> Fast Track
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground mt-1">{t.order.productName}</h3>
                    <p className="text-sm text-secondary font-semibold mt-0.5">Bagian: {t.partName}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className={cn(urgent && "font-semibold text-warning")}>
                      Deadline {new Date(t.order.deadline).toLocaleDateString("id-ID")} (H-{days})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> <span className="truncate">{t.order.address}</span>
                  </div>
                  {t.order.notes && (
                    <div className="flex items-start gap-1.5 sm:col-span-2">
                      <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{t.order.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Upah saat selesai</p>
                    <p className="font-bold text-foreground">{formatRupiah(t.point)}</p>
                  </div>
                  <Button
                    onClick={() => { finishSubtask(t.id); toast.success(`Selamat! Anda mendapat ${formatRupiah(t.point)}`); }}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Tandai Selesai
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}