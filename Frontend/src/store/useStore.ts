import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Notification, Order, PointEntry, Product, Specialization, SubTask, User } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { buildAutoNotifications } from "@/lib/autoNotifications";
import { sendRefreshSignal } from "@/lib/broadcast";

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? useStore.getState().token
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (res.status === 401) {
    useStore.getState().logout()
    throw new Error('Sesi Anda telah kedaluwarsa. Silakan masuk kembali.')
  }
  if (!res.ok) throw new Error(data.error || 'Request failed')

  const method = (options.method || 'GET').toUpperCase()
  if (method !== 'GET') {
    sendRefreshSignal()
  }

  return data
}

// ===== TYPE LOKAL UNTUK MANAJEMEN TOKO / LOCATIONS =====
export interface LocationStore {
  id: string;
  name: string;
}

export interface CategoryStore {
  id: string;
  name: string;
}

export interface MasterSkill {
  id: string;
  name: string;
}

export type OrderFormInput = Omit<Order, "id" | "code" | "createdAt" | "subtasks" | "status" | "productName"> & { 
  status?: Order["status"]; 
  productName?: string;
  locationName?: string; 
};

// ===== Mappers DB <-> Aplikasi =====
const mapUser = (r: any): User => ({
  id: r.id,
  username: r.username,
  name: r.name,
  role: r.role,
  specializations: r.specializations ?? [],
  avatar: r.avatar ?? undefined,
  capacity: r.capacity ?? 5,
  active: r.active,
  joinedAt: r.joined_at ?? r.created_at,
  password: r.password ?? undefined,
});

const mapProduct = (r: any, stocksData: any[] = []): Product => {
  const stockObj: any = {};
  const productStocks = stocksData.filter((s) => s.product_id === r.id);
  productStocks.forEach((s) => {
    if (s.location_id) {
      stockObj[s.location_id] = s.stock ?? 0;
    }
  });

  return {
    id: r.id,
    name: r.name,
    category: r.category,
    type: r.type,
    image: r.image,
    basePrice: r.base_price !== undefined ? r.base_price : r.basePrice, 
    parts: r.parts ?? [],
    stock: stockObj,
    minStock: r.min_stock !== undefined ? r.min_stock : r.minStock,
  };
};

const mapSubtask = (r: any): SubTask => ({
  id: r.id,
  orderId: r.order_id,
  productId: r.product_id,
  partName: r.part_name,
  point: r.point ?? 0,
  assignedTo: r.assigned_to ?? undefined,
  status: r.status,
  startedAt: r.started_at ?? undefined,
  finishedAt: r.finished_at ?? undefined,
});

const mapOrder = (r: any, subs: SubTask[]): Order => ({
  id: r.id,
  code: r.code,
  type: r.type as any,
  productId: r.product_id,
  productName: r.product_name,
  quantity: r.quantity,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  address: r.address,
  notes: r.notes ?? undefined,
  fastTrack: r.fast_track,
  status: r.status as any,
  createdAt: r.created_at,
  deadline: r.deadline,
  resi: r.resi ?? undefined,
  shippedAt: r.shipped_at ?? undefined,
  source: r.source ?? undefined,
  isOnline: r.is_online ?? true,
  subtasks: subs.filter((s) => s.orderId === r.id),
});

const mapPoint = (r: any): PointEntry => ({
  id: r.id,
  userId: r.user_id,
  subtaskId: r.subtask_id,
  orderId: r.order_id,
  orderCode: r.order_code ?? '',
  productName: r.product_name ?? '',
  partName: r.part_name ?? '',
  point: r.point ?? 0,
  date: r.date,
  description: r.description ?? "",
});

const mapNotif = (r: any): Notification => ({
  id: r.id,
  type: r.type,
  title: r.title,
  message: r.message,
  date: r.date,
  read: r.read,
  forRole: r.for_role,
});

const newId = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;

interface State {
  currentUser: User | null;
  users: User[];
  products: Product[];
  orders: Order[];
  points: PointEntry[];
  notifications: Notification[];
  skills: MasterSkill[];
  categories: CategoryStore[];
  locations: LocationStore[]; 
  token: string | null;
  loading: boolean;
  dismissedAutoNotifs: string[];

  bootstrap: () => Promise<void>;
  setProducts: (products: Product[]) => void;
  
  // REVISI: Cetakan fungsi baru untuk status penugasan terpusat
  getPengrajinStatus: (userId: string) => { status: "Tersedia" | "Sibuk"; activeTasks: number; maxCapacity: number | string };

  setCurrentUser: (user: User, token?: string) => void;
  logout: () => void;
  addOrder: (o: OrderFormInput) => Promise<void>;
  updateOrder: (id: string, updates: OrderFormInput) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  assignSubtask: (orderId: string, subtaskId: string, userId: string) => Promise<void>;
  unassignSubtask: (orderId: string, subtaskId: string) => Promise<void>;
  startSubtask: (subtaskId: string) => Promise<void>;
  finishSubtask: (subtaskId: string) => Promise<void>;
  finishAssembly: (orderId: string) => Promise<void>;
  setResi: (orderId: string, resi: string) => Promise<void>;

  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id" | "type">> & { stock?: any }) => Promise<void>;
  addStock: (productId: string, qty: number, locationId?: string) => Promise<void>;
  updateProductStock: (productId: string, delta: number, locationId?: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addLocation: (name: string) => Promise<{ ok: boolean; message?: string }>;
  updateLocation: (id: string, name: string) => Promise<{ ok: boolean; message?: string }>;
  deleteLocation: (id: string) => Promise<{ ok: boolean; message?: string }>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (role?: User["role"]) => Promise<void>;
  addUser: (u: Omit<User, "id" | "joinedAt"> & { password: string }) => Promise<{ ok: boolean; message?: string }>;
  updateUser: (id: string, patch: Partial<Omit<User, "id" | "role" | "joinedAt">> & { password?: string }) => Promise<{ ok: boolean; message?: string }>;
  toggleUserActive: (id: string) => Promise<{ ok: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
  addMasterSkill: (name: string) => Promise<{ ok: boolean; message?: string }>;
  updateMasterSkill: (id: string, name: string) => Promise<{ ok: boolean; message?: string }>;
  deleteMasterSkill: (id: string) => Promise<{ ok: boolean; message?: string }>;

  addCategory: (name: string) => Promise<{ ok: boolean; message?: string }>;
  updateCategory: (id: string, name: string) => Promise<{ ok: boolean; message?: string }>;
  deleteCategory: (id: string) => Promise<{ ok: boolean; message?: string }>;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      currentUser: null,
      token: null,
      users: [],
      products: [],
      orders: [],
      points: [],
      notifications: [],
      skills: [],
      categories: [],
      locations: [], 
      loading: false,
      dismissedAutoNotifs: [],

      bootstrap: async () => {
        set({ loading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            set({ loading: false, currentUser: null, token: null });
            return;
          }

          set({ token: session.access_token });

          // FASE 1: cari user spesifik → set currentUser → loading: false (≈200ms)
          const { data: matchedUser } = await supabase
            .from("users_app")
            .select("*")
            .eq("id", session.user.id)
            .single();
          const usersRes = await supabase.from("users_app").select("*");
          if (matchedUser) set({ currentUser: mapUser(matchedUser) });
          set({ users: (usersRes.data ?? []).map(mapUser), loading: false });

          // FASE 2: fetch data lainnya di background
          const [prodRes, stockRes, orderRes, subRes, ptRes, notifRes, skillRes, catRes, locRes] = await Promise.all([
            supabase.from("products").select("*"),
            supabase.from("product_stocks").select("*"),
            supabase.from("orders").select("*").order("created_at", { ascending: true }),
            supabase.from("subtasks").select("*"),
            supabase.from("point_entries").select("*").order("date", { ascending: false }),
            supabase.from("notifications").select("*").order("date", { ascending: false }),
            supabase.from("master_skills").select("id, name").order("name", { ascending: true }),
            supabase.from("categories").select("*").order("name", { ascending: true }),
            supabase.from("locations").select("*").order("name", { ascending: true }),
          ]);

          const subs = (subRes.data ?? []).map(mapSubtask);
          const loadedSkills = skillRes.data ? (skillRes.data as MasterSkill[]) : [];
          const stocksData = stockRes.data ?? [];

          set({
            products: (prodRes.data ?? []).map((p) => mapProduct(p, stocksData)),
            orders: (orderRes.data ?? []).map((r) => mapOrder(r, subs)),
            points: (ptRes.data ?? []).map(mapPoint),
            notifications: (notifRes.data ?? []).map(mapNotif),
            skills: loadedSkills,
            categories: (catRes.data ?? []) as CategoryStore[],
            locations: (locRes.data ?? []) as LocationStore[],
          });

          const refreshOrders = async () => {
            const [orderRes, subRes] = await Promise.all([
              supabase.from("orders").select("*").order("created_at", { ascending: true }),
              supabase.from("subtasks").select("*"),
            ]);
            const subs = (subRes.data ?? []).map(mapSubtask);
            set({ orders: (orderRes.data ?? []).map((r) => mapOrder(r, subs)) });
          };

          const refreshProducts = async () => {
            const [pRes, sRes] = await Promise.all([
              supabase.from("products").select("*"),
              supabase.from("product_stocks").select("*"),
            ]);
            set({ products: (pRes.data ?? []).map((p) => mapProduct(p, sRes.data ?? [])) });
          };

          // ========================================================
          // PENGECEKAN STATUS REALTIME SUPER KETAT & AMAN
          // ========================================================
          const existingChannels = supabase.getChannels();
          const oldChannel = existingChannels.find(
            (ch) => ch.topic === "realtime:knitflow" || (ch as any).name === "knitflow"
          );

          if (oldChannel && (oldChannel.state === "joined" || oldChannel.state === "joining")) {
            return;
          }

          if (oldChannel) {
            await supabase.removeChannel(oldChannel);
          }

          supabase.channel("knitflow")
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshOrders)
            .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, refreshOrders)
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, refreshProducts)
            .on("postgres_changes", { event: "*", schema: "public", table: "product_stocks" }, refreshProducts)
            .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, async () => {
              const r = await supabase.from("locations").select("*").order("name", { ascending: true });
              set({ locations: (r.data ?? []) as LocationStore[] });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "users_app" }, async () => {
              const r = await supabase.from("users_app").select("*");
              set({ users: (r.data ?? []).map(mapUser) });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "master_skills" }, async () => {
              const r = await supabase.from("master_skills").select("id, name").order("name", { ascending: true });
              if (r.data) set({ skills: r.data as MasterSkill[] });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, async () => {
              const r = await supabase.from("categories").select("*").order("name", { ascending: true });
              if (r.data) set({ categories: r.data as CategoryStore[] });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
              const r = await supabase.from("notifications").select("*").order("date", { ascending: false });
              set({ notifications: (r.data ?? []).map(mapNotif) });
            })
            .subscribe();

        } catch (error) {
          console.error("Bootstrap error:", error);
          set({ loading: false });
        }
      },

      setProducts: (products) => set({ products }),

      // ========================================================
      // LOGIKA TERPUSAT KESIBUKAN PENGRAJIN (PRINSIP BATASAN/UNLIMITED)
      // ========================================================
      getPengrajinStatus: (userId: string) => {
        const users = get().users;
        const orders = get().orders;
        
        const user = users.find(u => u.id === userId);
        if (!user) return { status: "Tersedia", activeTasks: 0, maxCapacity: 0 };

        // Hitung subtask aktif pengrajin (Antrean, Proses, Sedang Dikerjakan)
const activeTasks = orders.reduce((count, order) => {
  // Semua subtask milik user yang statusnya BUKAN "Selesai" berarti masih aktif/antre
  const userActiveSubs = order.subtasks.filter(
    s => s.assignedTo === userId && s.status !== "Selesai"
  );
  return count + userActiveSubs.length;
}, 0);
        // Jika kapasitas disetel 0 atau null, artinya TANPA BATASAN -> TERSEDIA TERUS
        if (user.capacity === 0 || user.capacity === null) {
          return {
            status: "Tersedia",
            activeTasks,
            maxCapacity: "∞"
          };
        }

        // Jika dibatasi angka (misal 6): Kurang dari kuota = Tersedia, Lebih dari sama dengan kuota = Sibuk
        const isBusy = activeTasks >= user.capacity;

        return {
          status: isBusy ? "Sibuk" : "Tersedia",
          activeTasks,
          maxCapacity: user.capacity
        };
      },

      setCurrentUser: (user, token) => {
        set({ currentUser: user, token: token ?? null })
      },
      logout: () => {
        supabase.auth.signOut().catch(() => {});
        sessionStorage.removeItem('knitflow-tab-session');
        set({ currentUser: null, token: null });
      },

      addOrder: async (o) => {
        const product = get().products.find((p) => p.id === o.productId);
        if (!product) return;
        const { id, code, type: effType, status, subtasks } = await apiFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(o),
        })
        const nowIso = new Date().toISOString()
        const dbData = {
          id, code, type: effType,
          product_id: product.id, product_name: product.name,
          quantity: o.quantity, customer_name: o.customerName,
          customer_phone: o.customerPhone, address: o.address,
          notes: o.notes ?? '', fast_track: effType === 'ready_stock' ? false : !!o.fastTrack,
          status, source: o.source ?? null, deadline: o.deadline ? new Date(o.deadline).toISOString() : nowIso,
          is_online: o.isOnline ?? true, resi: null, shipped_at: null, created_at: nowIso, updated_at: nowIso,
        }
        const tempSubtasks: SubTask[] = (subtasks ?? []).map((s: any) => ({
          id: s.id, orderId: s.orderId, productId: s.productId,
          partName: s.partName, point: s.point ?? 0, status: s.status,
        }))
        set((state) => ({ orders: [...state.orders, mapOrder(dbData, tempSubtasks)] }))

        const [pRes, sRes] = await Promise.all([
          supabase.from("products").select("*"),
          supabase.from("product_stocks").select("*"),
        ]);
        set({ products: (pRes.data ?? []).map((p) => mapProduct(p, sRes.data ?? [])) });
      },

      updateOrder: async (id, updates) => {
        await apiFetch(`/api/orders/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        })

        const [pRes, sRes] = await Promise.all([
          supabase.from("products").select("*"),
          supabase.from("product_stocks").select("*"),
        ]);
        set({ products: (pRes.data ?? []).map((p) => mapProduct(p, sRes.data ?? [])) });

        const product = get().products.find((p) => p.id === updates.productId)
        const oldOrder = get().orders.find((o) => o.id === id)
        const nextStatus = (() => {
          if (!oldOrder) return 'Antrean'
          if (oldOrder.type !== 'ready_stock' && updates.type === 'ready_stock') return 'Siap Kirim'
          if (oldOrder.type === 'ready_stock' && updates.type !== 'ready_stock') return 'Antrean'
          return oldOrder.status
        })()

        const { data: freshSubs } = await supabase.from('subtasks').select('*').eq('order_id', id)
        const updatedSubtasks: SubTask[] = (freshSubs ?? []).map((s: any) => ({
          id: s.id, orderId: s.order_id, productId: s.product_id,
          partName: s.part_name, point: s.point ?? 0,
          assignedTo: s.assigned_to ?? undefined,
          status: s.status, startedAt: s.started_at ?? undefined, finishedAt: s.finished_at ?? undefined,
        }))

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? {
              ...o,
              productId: updates.productId,
              productName: product?.name ?? o.productName,
              quantity: Number(updates.quantity),
              customerName: updates.customerName,
              customerPhone: updates.customerPhone,
              address: updates.address,
              notes: updates.notes,
              type: updates.type,
              fastTrack: updates.type === 'ready_stock' ? false : !!updates.fastTrack,
              deadline: updates.deadline,
              source: updates.source,
              isOnline: updates.isOnline ?? true,
              status: nextStatus as Order['status'],
              subtasks: updatedSubtasks,
            } : o
          ),
        }))
      },

      deleteOrder: async (id) => {
        await apiFetch(`/api/orders/${id}`, { method: 'DELETE' })
        set((state) => ({ orders: state.orders.filter((order) => order.id !== id) }))
      },

      assignSubtask: async (orderId, subtaskId, userId) => {
        await apiFetch(`/api/orders/${orderId}/subtask/assign`, {
          method: 'POST',
          body: JSON.stringify({ subtaskId, userId }),
        })

        const state = get()
        const order = state.orders.find((o) => o.id === orderId)
        const sub = order?.subtasks.find((s) => s.id === subtaskId)
        if (order && sub && userId) {
          await supabase.from("notifications").insert({
            id: `msg-${Date.now()}`,
            type: "task_assigned",
            title: "Tugas Baru",
            message: `${order.code} · ${order.productName} × ${order.quantity} · ${sub.partName}`,
            date: new Date().toISOString(),
            read: false,
            for_role: "pengrajin",
          })
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? {
              ...o,
              subtasks: o.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, assignedTo: userId, status: 'Antrean', startedAt: undefined } : s
              ),
            } : o
          ),
        }))
      },

      unassignSubtask: async (orderId, subtaskId) => {
        await apiFetch(`/api/orders/${orderId}/subtask/unassign`, {
          method: 'POST',
          body: JSON.stringify({ subtaskId }),
        })
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? {
              ...o,
              subtasks: o.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, assignedTo: undefined, status: 'Antrean', startedAt: undefined } : s
              ),
            } : o
          ),
        }))
      },

      startSubtask: async (subtaskId) => {
        const now = new Date().toISOString()
        const order = get().orders.find((o) => o.subtasks.some((s) => s.id === subtaskId))
        if (!order) return
        await apiFetch(`/api/orders/${order.id}/subtask/start`, {
          method: 'POST',
          body: JSON.stringify({ subtaskId }),
        })
        const nextOrderStatus = order.status === 'Antrean' ? 'Sedang Dikerjakan' : order.status
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id ? {
              ...o,
              status: nextOrderStatus,
              subtasks: o.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, status: 'Sedang Dikerjakan' as const, startedAt: now } : s
              ),
            } : o
          ),
        }))
      },

      finishSubtask: async (subtaskId) => {
        const now = new Date().toISOString()
        const order = get().orders.find((o) => o.subtasks.some((s) => s.id === subtaskId))
        const sub = order?.subtasks.find((s) => s.id === subtaskId)
        if (!order || !sub) return

        await apiFetch(`/api/orders/${order.id}/subtask/finish`, {
          method: 'POST',
          body: JSON.stringify({ subtaskId }),
        })

        if (sub.assignedTo) {
          const { data: freshPt } = await supabase.from('point_entries')
            .select('*').eq('subtask_id', subtaskId).order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (freshPt) {
            set((state) => ({ points: [mapPoint(freshPt), ...state.points] }))
          }
        }

        const updatedSubtasks = order.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, status: 'Selesai' as const, finishedAt: now } : s
        )
        const allDone = updatedSubtasks.every((s) => s.status === 'Selesai')
        const nextOrderStatus = allDone ? 'Penyusunan' : order.status
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id ? { ...o, status: nextOrderStatus, subtasks: updatedSubtasks } : o
          ),
        }))
      },

      finishAssembly: async (orderId) => {
        const { status } = await apiFetch(`/api/orders/${orderId}/finish`, { method: 'POST' })
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { ...o, status } : o),
        }))
      },

      setResi: async (orderId, resi) => {
        const now = new Date().toISOString()
        await apiFetch(`/api/orders/${orderId}/set-resi`, {
          method: 'POST',
          body: JSON.stringify({ resi }),
        })
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status: 'Selesai', resi, shippedAt: now } : order
          ),
        }));
      },

      addProduct: async (p) => {
        const { id } = await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(p),
        })
        const dbData = {
          id,
          name: p.name,
          category: p.category,
          type: p.type,
          image: p.image,
          base_price: p.basePrice,
          parts: p.parts as any,
          min_stock: p.minStock,
        }
        const stockEntries = Object.entries((p.stock ?? {}) as any).map(([locId, qty]: any) => ({
          product_id: id,
          location_id: locId,
          stock: Number(qty) || 0,
        }))
        set((state) => ({ products: [...state.products, mapProduct(dbData, stockEntries)] }))
      },

      updateProduct: async (id, patch) => {
        await apiFetch(`/api/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        })
        const cur = get().products.find((x) => x.id === id)
        const newType = patch.parts !== undefined ? (patch.parts.length > 1 ? "complex" : "simple") : cur?.type
        const { data: allStocks } = await supabase.from("product_stocks").select("*")
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? mapProduct({
                  ...p,
                  name: patch.name ?? p.name,
                  category: patch.category ?? p.category,
                  base_price: patch.basePrice ?? p.basePrice,
                  parts: patch.parts ?? p.parts,
                  min_stock: patch.minStock ?? p.minStock,
                  image: patch.image ?? p.image,
                  type: newType ?? p.type,
                }, allStocks ?? [])
              : p
          ),
        }))
      },

      addStock: async (productId, qty, locationId) => {
        if (qty <= 0) return;
        const defaultLocId = locationId || (get().locations[0]?.id || "loc-default");
        const stock = { [defaultLocId]: qty }
        await apiFetch(`/api/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify({ stock }),
        })
        const { data: allStocks } = await supabase.from("product_stocks").select("*")
        set((state) => ({
          products: state.products.map((prod) =>
            prod.id === productId ? mapProduct(prod, allStocks ?? []) : prod
          ),
        }))
      },

      updateProductStock: async (productId, delta, locationId) => {
        const defaultLocId = locationId || (get().locations[0]?.id || "loc-default")
        const { data: existing } = await supabase
          .from("product_stocks")
          .select("id, stock")
          .eq("product_id", productId)
          .eq("location_id", defaultLocId)
          .maybeSingle()
        const currentQty = existing ? (existing.stock ?? 0) : 0
        const newStock = Math.max(0, currentQty + delta)
        const stock = { [defaultLocId]: newStock }
        await apiFetch(`/api/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify({ stock }),
        })
        const { data: allStocks } = await supabase.from("product_stocks").select("*")
        set((state) => ({
          products: state.products.map((prod) =>
            prod.id === productId ? mapProduct(prod, allStocks ?? []) : prod
          ),
        }))
      },

      deleteProduct: async (id) => {
        await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }))
      },

      addLocation: async (name) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama toko tidak boleh kosong" };
        if (get().locations.some((l) => l.name.toLowerCase() === cleaned.toLowerCase())) {
          return { ok: false, message: "Nama toko sudah ada di database" };
        }
        try {
          const { location } = await apiFetch('/api/locations', {
            method: 'POST', body: JSON.stringify({ name: cleaned }),
          })
          set((state) => ({
            locations: [...state.locations, location]
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menyimpan toko baru' }
        }
      },

      updateLocation: async (id: string, name: string) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama toko tidak boleh kosong" };
        if (get().locations.some((l) => l.name.toLowerCase() === cleaned.toLowerCase() && l.id !== id)) {
          return { ok: false, message: "Nama toko sudah ada di database" };
        }
        try {
          const { location } = await apiFetch(`/api/locations/${id}`, {
            method: 'PUT', body: JSON.stringify({ name: cleaned }),
          })
          set((state) => ({
            locations: state.locations
              .map((l) => (l.id === id ? { id: l.id, name: location.name } : l))
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal memperbarui nama toko' }
        }
      },

      deleteLocation: async (id) => {
        try {
          await apiFetch(`/api/locations/${id}`, { method: 'DELETE' })
          set((state) => ({ locations: state.locations.filter((l) => l.id !== id) }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menghapus toko' }
        }
      },

      markNotificationRead: async (id) => {
        if (id.startsWith("auto-")) {
          set({ dismissedAutoNotifs: [...get().dismissedAutoNotifs, id] })
        } else {
          await supabase.from("notifications").update({ read: true }).eq("id", id)
          set({
            notifications: get().notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          })
        }
      },

      markAllNotificationsRead: async (role) => {
        await supabase.from("notifications").update({ read: true }).not("id", "like", "auto-%")
        set((state) => ({
          notifications: state.notifications.map((n) =>
            !role || n.forRole === role || n.forRole === "all" ? { ...n, read: true } : n
          ),
          dismissedAutoNotifs: [
            ...state.dismissedAutoNotifs,
            ...buildAutoNotifications(state.orders, state.products)
              .filter((n) => !role || n.forRole === role || n.forRole === "all")
              .map((n) => n.id),
          ],
        }))
      },

      addUser: async (u) => {
        const username = u.username.trim().toLowerCase();
        if (!username || !u.name.trim() || !u.password) {
          return { ok: false, message: "Nama, username, dan password wajib diisi." };
        }
        if (get().users.some((x) => x.username.toLowerCase() === username)) {
          return { ok: false, message: "Username sudah dipakai." };
        }
        const token = get().token;
        const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(u),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, message: data.error || 'Gagal menyimpan user' };
        const joined_at = new Date().toISOString();
        const dbData = {
          id: data.user?.id ?? data.id,
          username,
          name: u.name.trim(),
          role: u.role,
          specializations: (u.specializations ?? []) as any,
          capacity: u.capacity ?? 5,
          active: true,
          joined_at,
          created_at: joined_at,
          updated_at: joined_at
        };
        set((state) => ({ users: [...state.users, mapUser(dbData)] }));
        return { ok: true };
      },

      updateUser: async (id, patch) => {
        if (patch.password) {
          try {
            await apiFetch('/api/auth/change-password', {
              method: 'POST',
              body: JSON.stringify({ userId: id, password: patch.password }),
            })
          } catch (e: any) {
            return { ok: false, message: e.message || 'Gagal mengubah password' }
          }
        }
        try {
          await apiFetch(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(patch),
          })
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal memperbarui ke database' }
        }
        const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...cleanPatch } : u)),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...cleanPatch } : state.currentUser,
        }))
        return { ok: true }
      },

      toggleUserActive: async (id) => {
        try {
          const { active } = await apiFetch(`/api/users/${id}/toggle-active`, { method: 'POST' })
          set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, active } : u)) }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal memperbarui status aktif' }
        }
      },

      deleteUser: async (id) => {
        try {
          await apiFetch('/api/auth/unregister', {
            method: 'POST',
            body: JSON.stringify({ id }),
          })
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menghapus user' }
        }
        set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
        return { ok: true };
      },

      addMasterSkill: async (name) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama skill tidak boleh kosong" };
        if (get().skills.some((s) => s.name.toLowerCase() === cleaned.toLowerCase())) {
          return { ok: false, message: "Nama skill sudah terdaftar" };
        }
        try {
          const { skill } = await apiFetch('/api/skills', {
            method: 'POST', body: JSON.stringify({ name: cleaned }),
          })
          set((state) => ({
            skills: [...state.skills, { id: skill.id, name: skill.name }]
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menyimpan skill' }
        }
      },

      updateMasterSkill: async (id, name) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama skill tidak boleh kosong" };
        try {
          await apiFetch(`/api/skills/${id}`, {
            method: 'PUT', body: JSON.stringify({ name: cleaned }),
          })
          set((state) => ({
            skills: state.skills
              .map((s) => s.id === id ? { ...s, name: cleaned } : s)
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal memperbarui skill' }
        }
      },

      deleteMasterSkill: async (id) => {
        try {
          await apiFetch(`/api/skills/${id}`, { method: 'DELETE' })
          set((state) => ({ skills: state.skills.filter((s) => s.id !== id) }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menghapus skill' }
        }
      },

      addCategory: async (name) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama kategori tidak boleh kosong" };
        if (get().categories.some((c) => c.name.toLowerCase() === cleaned.toLowerCase())) {
          return { ok: false, message: "Nama kategori sudah terdaftar" };
        }
        try {
          const { category } = await apiFetch('/api/categories', {
            method: 'POST', body: JSON.stringify({ name: cleaned }),
          })
          set((state) => ({
            categories: [...state.categories, { id: category.id, name: category.name }]
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menyimpan kategori' }
        }
      },

      updateCategory: async (id, name) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama kategori tidak boleh kosong" };
        try {
          await apiFetch(`/api/categories/${id}`, {
            method: 'PUT', body: JSON.stringify({ name: cleaned }),
          })
          set((state) => ({
            categories: state.categories
              .map((c) => c.id === id ? { ...c, name: cleaned } : c)
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal memperbarui kategori' }
        }
      },

      deleteCategory: async (id) => {
        try {
          await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
          set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
          return { ok: true }
        } catch (e: any) {
          return { ok: false, message: e.message || 'Gagal menghapus kategori' }
        }
      },
    }),
    {
      name: "knitflow-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
      }),
    }
  )
);

export const daysUntil = (iso: string) => {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};