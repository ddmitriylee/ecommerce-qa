import { create } from 'zustand';
import { api } from '../../shared/api/client';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    discount: number;
    image_url: string | null;
    stock: number;
  };
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  totalItems: number;
  totalPrice: number;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

function calcTotals(items: CartItem[]) {
  let totalItems = 0;
  let totalPrice = 0;
  for (const item of items) {
    totalItems += item.quantity;
    if (item.product) {
      const price = item.product.discount > 0
        ? item.product.price * (1 - item.product.discount / 100)
        : item.product.price;
      totalPrice += price * item.quantity;
    }
  }
  return { totalItems, totalPrice: Math.round(totalPrice * 100) / 100 };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  totalItems: 0,
  totalPrice: 0,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data: res } = await api.get('/cart');
      const items = res.data || [];
      set({ items, ...calcTotals(items), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addToCart: async (productId, quantity = 1) => {
    try {
      await api.post('/cart', { product_id: productId, quantity });
      await get().fetchCart();
    } catch {
      // Ignore error
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      await api.put(`/cart/${itemId}`, { quantity });
      await get().fetchCart();
    } catch {
      // Ignore error
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      await get().fetchCart();
    } catch {
      // Ignore error
    }
  },

  clearCart: async () => {
    try {
      await api.delete('/cart');
      set({ items: [], totalItems: 0, totalPrice: 0 });
    } catch {
      // Ignore error
    }
  },
}));
