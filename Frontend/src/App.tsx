import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { listenRefreshSignal } from "@/lib/broadcast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/auth/Login";
import { AppLayout } from "./layouts/AppLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPengrajin from "./pages/admin/AdminPengrajin";
import AdminWaitingList from "./pages/admin/AdminWaitingList";
import AdminSmartAssign from "./pages/admin/AdminSmartAssign";
import AdminSkills from "./pages/admin/AdminSkills";
import PengrajinTasks from "./pages/pengrajin/PengrajinTasks";
import PengrajinActiveTasks from "./pages/pengrajin/PengrajinActiveTasks";
import PengrajinHistory from "./pages/pengrajin/PengrajinHistory";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerPengrajinReport from "./pages/owner/OwnerPengrajinReport";
import OwnerProducts from "./pages/owner/OwnerProducts";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => {
  const bootstrap = useStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const cleanup = listenRefreshSignal(() => {
      bootstrap();
    })
    return cleanup
  }, [bootstrap])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/pengrajin" element={<AdminPengrajin />} />
              <Route path="/admin/waiting-list" element={<AdminWaitingList />} />
              <Route path="/admin/smart-assign" element={<AdminSmartAssign />} />
              <Route path="/admin/skills" element={<AdminSkills />} />
              <Route path="/admin/notifications" element={<Notifications />} />
              <Route path="/pengrajin" element={<PengrajinTasks />} />
              <Route path="/pengrajin/active" element={<PengrajinActiveTasks />} />
              <Route path="/pengrajin/history" element={<PengrajinHistory />} />
              <Route path="/pengrajin/notifications" element={<Notifications />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/reports" element={<OwnerReports />} />
              <Route path="/owner/reports/pengrajin" element={<OwnerPengrajinReport />} />
              <Route path="/owner/products" element={<OwnerProducts />} />
              <Route path="/owner/notifications" element={<Notifications />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
