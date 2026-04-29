import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "warning" | "destructive" | "success";
  hint?: string;
}

const variantStyles: Record<string, string> = {
  primary: "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  success: "bg-success text-success-foreground",
};

export const StatCard = ({ label, value, icon: Icon, variant = "primary", hint }: Props) => (
  <Card className="p-5 shadow-[var(--shadow-card)] border-border/50 hover:shadow-[var(--shadow-glow)] transition-all">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("p-3 rounded-xl", variantStyles[variant])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);