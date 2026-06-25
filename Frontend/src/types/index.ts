export type Role = "admin" | "pengrajin" | "owner";

// Mengubah tipe agar fleksibel mendukung skill statis bawaan sekaligus skill baru yang ditambahkan dinamis
export type Specialization =
  | "Kepala"
  | "Badan"
  | "Tangan"
  | "Kaki"
  | "Tas"
  | "Gantungan Kunci"
  | "Aksesoris"
  | "Perakitan"
  | (string & {});

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  specializations?: Specialization[];
  avatar?: string;
  joinedAt: string;
  active?: boolean;
  capacity?: number;
  password?: string;
}

export interface ProductPart {
  name: Specialization;
  point: number;
}

export type ProductType = "simple" | "complex";
export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  type: ProductType;
  image: string;
  basePrice: number;
  parts: ProductPart[];
  stock: number;
  minStock: number;
}

export type OrderType = "custom" | "ready_stock";

// Status produksi (Bahasa Indonesia)
export type OrderStatus =
  | "Antrean"
  | "Sedang Dikerjakan"
  | "Penyusunan"
  | "Siap Kirim"
  | "Selesai";

export type SubTaskStatus = "Antrean" | "Sedang Dikerjakan" | "Selesai";

export interface SubTask {
  id: string;
  orderId: string;
  productId: string;
  partName: Specialization;
  point: number;
  assignedTo?: string;
  status: SubTaskStatus;
  startedAt?: string;
  finishedAt?: string;
}

export interface Order {
  id: string;
  code: string;
  type: OrderType;
  productId: string;
  productName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  address: string;
  notes?: string;
  fastTrack: boolean;
  status: OrderStatus;
  createdAt: string;
  deadline: string;
  subtasks: SubTask[];
  resi?: string;
  shippedAt?: string;
  source?: string;
  isOnline?: boolean;
}

export interface PointEntry {
  id: string;
  userId: string;
  subtaskId: string;
  orderId: string;
  orderCode: string;
  productName: string;
  partName: string;
  point: number;
  date: string;
  description: string;
}

export interface Notification {
  id: string;
  type: "deadline" | "task_done" | "stock_low" | "info" | "task_assigned";
  title: string;
  message: string;
  date: string;
  read: boolean;
  forRole: Role | "all";
}