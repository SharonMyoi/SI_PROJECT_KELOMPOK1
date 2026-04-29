import { LucideIcon } from "lucide-react";

export const EmptyState = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 rounded-full bg-muted mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
  </div>
);