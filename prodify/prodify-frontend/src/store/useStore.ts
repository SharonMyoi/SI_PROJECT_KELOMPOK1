import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Notification, Order, PointEntry, Product, SubTask, User } from "@/types";
import { mockNotifications, mockOrders, mockPoints, mockProducts, mockUsers } from "@/data/mockData";

interface State {
  currentUser: User | null;
  users: User[];
  products: Product[];
  orders: Order[];
  points: PointEntry[];
  notifications: Notification[];

  login: (username: string, password: string) => User | null;
  logout: () => void;

  addOrder: (o: Omit<Order, "id" | "code" | "createdAt" | "subtasks" | "status"> & { status?: Order["status"] }) => void;
  assignSubtask: (orderId: string, subtaskId: string, userId: string) => void;
  finishSubtask: (subtaskId: string) => void;
  finishAssembly: (orderId: string) => void;
  setResi: (orderId: string, resi: string) => void;

  addProduct: (p: Omit<Product, "id">) => void;
  updateProductStock: (productId: string, delta: number) => void;

  markNotificationRead: (id: string) => void;
}

const code = (n: number) => `ORD-${String(n).padStart(4, "0")}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: mockUsers,
      products: mockProducts,
      orders: mockOrders,
      points: mockPoints,
      notifications: mockNotifications,

      login: (username, password) => {
        const u = get().users.find((x) => x.username === username && x.password === password);
        if (u) set({ currentUser: u });
        return u ?? null;
      },
      logout: () => set({ currentUser: null }),

      addOrder: (o) => {
        const product = get().products.find((p) => p.id === o.productId);
        if (!product) return;
        const id = `o${Date.now()}`;
        const nextNum = get().orders.length + 1;
        const subtasks: SubTask[] =
          o.type === "ready_stock"
            ? []
            : product.parts.map((part) => ({
                id: `${id}-${part.name}`,
                orderId: id,
                productId: product.id,
                partName: part.name,
                point: part.point,
                status: "Waiting",
              }));
        const status: Order["status"] = o.type === "ready_stock" ? "Ready to Ship" : "Waiting";
        const newOrder: Order = {
          ...o,
          id,
          code: code(nextNum),
          createdAt: new Date().toISOString(),
          subtasks,
          status,
          productName: product.name,
        };
        set({ orders: [newOrder, ...get().orders] });
        if (o.type === "ready_stock") {
          get().updateProductStock(product.id, -o.quantity);
        }
      },

      assignSubtask: (orderId, subtaskId, userId) => {
        set({
          orders: get().orders.map((o) =>
            o.id !== orderId
              ? o
              : {
                  ...o,
                  status: o.status === "Waiting" ? "On Progress" : o.status,
                  subtasks: o.subtasks.map((s) =>
                    s.id === subtaskId
                      ? { ...s, assignedTo: userId, status: "On Progress", startedAt: new Date().toISOString() }
                      : s
                  ),
                }
          ),
        });
      },

      finishSubtask: (subtaskId) => {
        const orders = get().orders;
        const newPoints: PointEntry[] = [];
        const updated = orders.map((o) => {
          if (!o.subtasks.some((s) => s.id === subtaskId)) return o;
          const subtasks = o.subtasks.map((s) => {
            if (s.id !== subtaskId) return s;
            if (s.status !== "Selesai" && s.assignedTo) {
              newPoints.push({
                id: `pt-${Date.now()}`,
                userId: s.assignedTo,
                subtaskId: s.id,
                orderCode: o.code,
                productName: o.productName,
                partName: s.partName,
                point: s.point,
                date: new Date().toISOString(),
              });
            }
            return { ...s, status: "Selesai" as const, finishedAt: new Date().toISOString() };
          });
          const allDone = subtasks.every((s) => s.status === "Selesai");
          return { ...o, subtasks, status: allDone ? ("Assembling" as const) : o.status };
        });
        set({ orders: updated, points: [...newPoints, ...get().points] });
      },

      finishAssembly: (orderId) => {
        set({
          orders: get().orders.map((o) =>
            o.id === orderId ? { ...o, status: "Ready to Ship" } : o
          ),
        });
      },

      setResi: (orderId, resi) => {
        set({
          orders: get().orders.map((o) =>
            o.id === orderId
              ? { ...o, resi, status: "Done", shippedAt: new Date().toISOString() }
              : o
          ),
        });
      },

      addProduct: (p) => {
        const id = `p${Date.now()}`;
        set({ products: [{ ...p, id }, ...get().products] });
      },

      updateProductStock: (productId, delta) => {
        set({
          products: get().products.map((p) =>
            p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p
          ),
        });
      },

      markNotificationRead: (id) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }),
    }),
    { name: "prodify-store" }
  )
);

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export const daysUntil = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};