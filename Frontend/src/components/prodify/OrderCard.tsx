import { Order } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { daysUntil } from "@/store/useStore";
import { Calendar, Package, User, Zap } from "lucide-react";
import { getSourceIcon } from "@/lib/orderSources";
import { cn } from "@/lib/utils";

interface Props {
  order: Order;
  onClick?: () => void;
  compact?: boolean;
}

export const OrderCard = ({ order, onClick, compact }: Props) => {
  const days = daysUntil(order.deadline);
  
  // Logika bar kiri tebal (border-l-4) berdasarkan sisa hari
  let urgentClass = "border-l-transparent";

  if (order.status !== "Selesai" && order.status !== "Siap Kirim") {
    if (days <= 1) {
      urgentClass = "border-l-4 border-l-destructive bg-destructive/5";
    } else if (days <= 3) {
      urgentClass = "border-l-4 border-l-warning bg-warning/5";
    }
  }

  const totalSubtasks = order.subtasks?.length || 0;
  const doneSubtasks = order.subtasks ? order.subtasks.filter((s) => s.status === "Selesai").length : 0;
  const progress = totalSubtasks ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 hover:shadow-[var(--shadow-card)] transition-all flex flex-col justify-between h-full",
        onClick && "cursor-pointer",
        urgentClass
      )}
    >
      {/* Bagian Atas Kotak */}
      <div className="w-full">
        
        {/* HEADER BARIS UTAMA */}
        <div className="flex items-center justify-between gap-2 h-6 mb-3 relative pr-5">
          
          {/* Sisi Kiri: Diubah menjadi flex row murni tanpa flex-1 agar urutan mengunci dari kiri ke kanan */}
          <div className="flex items-center gap-2">
            {/* 1. KODE ORDERAN */}
            <p className="font-mono text-xs font-semibold text-secondary leading-none shrink-0">
              {order.code}
            </p>
            
            {/* 2. BADGE READY STOCK */}
            {order.type === "ready_stock" && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium leading-none h-5 whitespace-nowrap shrink-0">
                Ready Stock
              </span>
            )}

            {/* 3. BADGE PRIORITAS TINGGI */}
            {order.fastTrack && (
              <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-white text-[10px] font-bold uppercase tracking-wider leading-none h-5 whitespace-nowrap shrink-0">
                <Zap className="h-2.5 w-2.5 text-white" /> PRIORITAS TINGGI
              </span>
            )}
          </div>
          
          {/* Sisi Kanan: StatusBadge */}
          <div className="shrink-0 flex items-center h-full mr-1 text-[10px] font-medium [&_span]:text-[10px] [&_span]:px-2.5 [&_span]:py-0.5 [&_span]:h-5 [&_span]:inline-flex [&_span]:items-center [&_span]:justify-center [&_div]:text-[10px] [&_div]:px-2.5 [&_div]:py-0.5 [&_div]:h-5 [&_div]:inline-flex [&_div]:items-center [&_div]:justify-center">
            <StatusBadge status={order.status} />
          </div>

        </div>

        {/* Nama Produk diletakkan terpisah di bawah baris flex header */}
        <div className="mb-3">
          <h3 className="font-semibold text-foreground truncate">{order.productName}</h3>
        </div>

        {!compact && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span>{order.quantity} pcs</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
<span 
  className={cn(
    // SEKARANG SEMUANYA DIBIKIN TEBAL (font-semibold) asalkan belum Selesai.
    // Tidak peduli masih H-7 atau H-1.
    order.status !== "Selesai" && "font-semibold", 
    
    // Logic warna di bawah ini biarkan saja, hanya mengatur Kuning/Merah saat mepet
    order.status !== "Selesai" && order.status !== "Siap Kirim" && days <= 1 
      ? "text-destructive" 
      : order.status !== "Selesai" && order.status !== "Siap Kirim" && days <= 3 
        ? "text-warning" 
        : ""
  )}
>
                Tenggat: {new Date(order.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                {order.status !== "Selesai" && (
                  <span className="ml-1">
                    ({days > 0 ? `H-${days}` : days === 0 ? "Hari ini!" : `Telat ${Math.abs(days)} hari`})
                  </span>
                )}
              </span>
            </div>

            {/* SUMBER PESANAN */}
            {order.source && (() => {
              const Ic = getSourceIcon(order.source);
              return (
                <div className="col-span-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-medium w-max">
                    <Ic className="h-3 w-3" /> {order.source}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bagian Bawah Kotak (Progress Subtask & Button) */}
      <div className="w-full mt-auto">
        {totalSubtasks > 0 ? (
          <div className="mb-1">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Progress Bagian</span>
              <span className="font-semibold">{doneSubtasks}/{totalSubtasks}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="h-7 aria-hidden='true'" />
        )}

        {onClick && (
          <Button variant="ghost" size="sm" className="w-full mt-2 text-secondary hover:text-secondary hover:bg-secondary/10">
            Lihat Detail →
          </Button>
        )}
      </div>
    </Card>
  );
};