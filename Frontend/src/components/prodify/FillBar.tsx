import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}

export function FillBar({ value, max, className, barClassName }: Props) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? (value / max) * 100 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 50);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div className={cn("h-2.5 rounded-full bg-muted overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", barClassName)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
