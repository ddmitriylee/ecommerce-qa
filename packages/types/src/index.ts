// ─── User ───────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Category ───────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  created_at: string;
}

// ─── Product ────────────────────────────────────────
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  stock: number;
  category_id: string;
  image_url: string | null;
  created_at: string;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

// ─── Cart ───────────────────────────────────────────
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

// ─── Order ──────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  total_price: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// ─── API ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T;
  error: string | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ─── DTOs ───────────────────────────────────────────
export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  full_name: string;
}

export interface CreateProductDTO {
  title: string;
  description: string;
  price: number;
  discount?: number;
  stock: number;
  category_id: string;
  image_url?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface AddToCartDTO {
  product_id: string;
  quantity: number;
}

export interface CreateOrderDTO {
  items: { product_id: string; quantity: number }[];
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
}

export interface UpdateProfileDTO {
  full_name?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
}

// ─── Filters ────────────────────────────────────────
export interface ProductFilters {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: 'price' | 'created_at' | 'title';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
