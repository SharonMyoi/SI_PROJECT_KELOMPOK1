import { Sparkles } from "lucide-react";

export const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: { icon: "h-5 w-5", text: "text-base", sub: "text-[10px]" },
    md: { icon: "h-6 w-6", text: "text-xl", sub: "text-[11px]" },
    lg: { icon: "h-8 w-8", text: "text-3xl", sub: "text-xs" },
  }[size];
  return (
    <div className="flex items-center gap-2.5">
      <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-glow)]">
        <Sparkles className={`${sizes.icon} text-primary-foreground`} />
      </div>
      <div className="leading-none">
        <p className={`font-bold tracking-tight text-secondary ${sizes.text}`}>PRODIFY</p>
        <p className={`${sizes.sub} text-muted-foreground font-medium`}>RieFa Collection</p>
      </div>
    </div>
  );
};