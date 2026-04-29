import { useStore } from "@/store/useStore";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "@/components/prodify/Logo";
import {
  LayoutDashboard, ClipboardList, Package, Users, Bell, LogOut, History, ListChecks, FileBarChart, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Role } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/orders", label: "Pesanan", icon: ClipboardList },
    { to: "/admin/products", label: "Produk & Stok", icon: Package },
    { to: "/admin/pengrajin", label: "Pengrajin", icon: Users },
  ],
  pengrajin: [
    { to: "/pengrajin", label: "Task Saya", icon: ListChecks },
    { to: "/pengrajin/history", label: "Riwayat & Upah", icon: History },
  ],
  owner: [
    { to: "/owner", label: "Dashboard", icon: LayoutDashboard },
    { to: "/owner/reports", label: "Laporan Bulanan", icon: FileBarChart },
  ],
};

const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const { currentUser, logout, notifications } = useStore();
  const navigate = useNavigate();
  if (!currentUser) return null;
  const items = navByRole[currentUser.role];
  const unread = notifications.filter((n) => !n.read && (n.forRole === currentUser.role || n.forRole === "all")).length;

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="p-5 border-b border-border">
        <Logo />
      </div>
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Login sebagai</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{currentUser.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === `/${currentUser.role}`}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        ))}
        {currentUser.role !== "pengrajin" && (
          <NavLink
            to={`/${currentUser.role}/notifications`}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )
            }
          >
            <span className="flex items-center gap-3">
              <Bell className="h-4 w-4" />
              Notifikasi
            </span>
            {unread > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                {unread}
              </span>
            )}
          </NavLink>
        )}
      </nav>
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-foreground/70 hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </div>
  );
};

export const AppLayout = () => {
  const { currentUser } = useStore();
  const [open, setOpen] = useState(false);
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden lg:flex w-64 border-r border-border shrink-0">
        <SidebarContent />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <Logo size="sm" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};