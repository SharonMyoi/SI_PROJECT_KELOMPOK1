export type Role = "admin" | "pengrajin" | "owner";

export type Specialization =
  | "Kepala"
  | "Badan"
  | "Tangan"
  | "Kaki"
  | "Tas"
  | "Gantungan Kunci"
  | "Aksesoris"
  | "Perakitan";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
  specializations?: Specialization[];
  avatar?: string;
  joinedAt: string;
}

export interface ProductPart {
  name: Specialization;
  point: number; // upah
}

export type ProductType = "simple" | "complex";
export type ProductCategory = "Boneka" | "Tas" | "Gantungan Kunci" | "Aksesoris";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  type: ProductType;
  image: string;
  basePrice: number;
  parts: ProductPart[]; // master template
  stock: number; // ready stock
  minStock: number;
}

export type OrderType = "custom" | "ready_stock";
export type OrderStatus =
  | "Waiting"
  | "On Progress"
  | "Assembling"
  | "Ready to Ship"
  | "Done";

export type SubTaskStatus = "Waiting" | "On Progress" | "Selesai";

export interface SubTask {
  id: string;
  orderId: string;
  productId: string;
  partName: Specialization;
  point: number;
  assignedTo?: string; // user id
  status: SubTaskStatus;
  startedAt?: string;
  finishedAt?: string;
}

export interface Order {
  id: string;
  code: string; // e.g. ORD-0001
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
}

export interface PointEntry {
  id: string;
  userId: string;
  subtaskId: string;
  orderCode: string;
  productName: string;
  partName: string;
  point: number;
  date: string;
}

export interface Notification {
  id: string;
  type: "deadline" | "task_done" | "stock_low" | "info";
  title: string;
  message: string;
  date: string;
  read: boolean;
  forRole: Role | "all";
}