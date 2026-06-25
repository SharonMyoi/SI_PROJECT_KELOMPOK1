import { useStore } from "@/store/useStore";
import { Navigate, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/prodify/Logo";
import {
  LayoutDashboard, ClipboardList, Package, Users, Bell, LogOut, History, ListChecks, FileBarChart, Menu, Clock, Brain, Sparkles, Play, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Role } from "@/types";
import { buildAutoNotifications, filterByRole } from "@/lib/autoNotifications";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/orders", label: "Pesanan", icon: ClipboardList },
    { to: "/admin/waiting-list", label: "Penugasan", icon: Clock },
    { to: "/admin/products", label: "Produk & Stok", icon: Package },
    { to: "/admin/pengrajin", label: "Pengrajin", icon: Users },
  ],
  pengrajin: [
    { to: "/pengrajin", label: "Tugas Saya", icon: ListChecks },
    { to: "/pengrajin/active", label: "Sedang Dikerjakan", icon: Play },
    { to: "/pengrajin/history", label: "Riwayat & Upah", icon: History },
  ],
  owner: [
    { to: "/owner", label: "Dashboard", icon: LayoutDashboard },
    { to: "/owner/products", label: "Produk & Stok", icon: Package },
    { to: "/owner/reports", label: "Laporan Pesanan", icon: FileBarChart },
    { to: "/owner/reports/pengrajin", label: "Laporan Pengrajin", icon: Users },
  ],
};

const allowedPrefixes: Record<Role, string[]> = {
  admin: ["/admin"],
  pengrajin: ["/pengrajin"],
  owner: ["/owner"],
};

const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const { currentUser, logout, notifications, orders, products, dismissedAutoNotifs } = useStore();
  const navigate = useNavigate();
  if (!currentUser) return null;
  const items = navByRole[currentUser.role];
  const auto = buildAutoNotifications(orders, products).map((n) => ({ ...n, read: n.read || dismissedAutoNotifs.includes(n.id) }));
  const unread = filterByRole([...auto, ...notifications], currentUser.role).filter((n) => !n.read).length;
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="flex h-full flex-col bg-card overflow-hidden">
      <div className="p-5 pb-3">
        <Logo variant="full" />
      </div>
      <div className="px-4 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Masuk sebagai</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{currentUser.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={items.some(other => other.to !== it.to && other.to.startsWith(it.to + "/"))}
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
      </nav>
      <div className="p-3 border-t border-border">
        <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-foreground/70 hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin keluar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Tidak</AlertDialogCancel>
              <AlertDialogAction onClick={() => { logout(); navigate("/login"); setShowLogout(false); }}>
                Ya
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export const AppLayout = () => {
  const { currentUser, loading } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isTabSession = sessionStorage.getItem('knitflow-tab-session') === 'true';

  useEffect(() => {
    if (loading) return;
    if (!currentUser || !isTabSession) {
      navigate("/login", { replace: true });
    } else {
      const prefixes = allowedPrefixes[currentUser.role];
      const isAllowed = prefixes.some((p) => location.pathname.startsWith(p));
      if (!isAllowed) navigate(`/${currentUser.role}`, { replace: true });
    }
  }, [currentUser, isTabSession, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser || !isTabSession) return <Navigate to="/login" replace />;

  const prefixes = allowedPrefixes[currentUser.role];
  const isAllowed = prefixes.some((p) => location.pathname.startsWith(p));
  if (!isAllowed) return <Navigate to={`/${currentUser.role}`} replace />;

  return (
    <div className="h-screen overflow-hidden bg-muted/30 flex">
      <style>{`
        @media (max-width: 768px) {
          .text-2xl, .text-3xl { display: flex !important; flex-wrap: wrap !important; align-items: baseline !important; gap: 4px !important; }
          .flex.items-center.gap-2, [class*="gap-2"] { flex-wrap: wrap !important; gap: 6px !important; }
          .rounded-full { margin-bottom: 2px !important; }
        }
      `}</style>

      <aside className="hidden lg:flex w-44 shrink-0 bg-card border-r border-border">
        <SidebarContent />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-screen bg-background">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Logo size="sm" variant="full" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <SidebarContent onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
        <div className="flex-1 overflow-y-auto pl-4 sm:pl-5 lg:pl-6 pr-4 sm:pr-5 lg:pr-6 py-4 sm:py-5 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
