import { ReactNode } from "react";

export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);