import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface TelegramUser {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  shippingAddress: ShippingAddress;
  telegramUser?: TelegramUser;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface CartState {
  items: CartItem[];
  shippingAddress: ShippingAddress | null;
  telegramUser: TelegramUser | null;
  promoCode: string | null;
  total: number;
  orders: Order[];
  favorites: string[]; // product IDs
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setShippingAddress: (address: ShippingAddress) => void;
  setTelegramUser: (user: TelegramUser) => void;
  applyPromoCode: (code: string) => void;
  calculateTotal: () => number;
  getItemCount: () => number;
  
  // Order actions
  addOrder: (order: Order) => void;
  getOrders: () => Order[];
  
  // Favorites
  addToFavorites: (productId: string) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      shippingAddress: null,
      telegramUser: null,
      promoCode: null,
      total: 0,
      orders: [],
      favorites: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { ...product, quantity }],
          };
        });
        
        get().calculateTotal();
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
        
        get().calculateTotal();
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
        }));
        
        get().calculateTotal();
      },

      clearCart: () => {
        set({ items: [], promoCode: null, total: 0 });
      },

      setShippingAddress: (address: ShippingAddress) => {
        set({ shippingAddress: address });
      },

      setTelegramUser: (user: TelegramUser) => {
        set({ telegramUser: user });
      },

      applyPromoCode: (code: string) => {
        set({ promoCode: code });
        get().calculateTotal();
      },

      calculateTotal: () => {
        const state = get();
        const subtotal = state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        
        const discount = state.promoCode ? subtotal * 0.1 : 0;
        const total = subtotal - discount;
        
        set({ total: Math.round(total * 100) / 100 });
        
        return total;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Order actions
      addOrder: (order: Order) => {
        set((state) => ({
          orders: [order, ...state.orders],
          items: [],
          total: 0,
          promoCode: null,
        }));
      },

      getOrders: () => {
        return get().orders;
      },

      // Favorites
      addToFavorites: (productId: string) => {
        set((state) => ({
          favorites: [...state.favorites, productId],
        }));
      },

      removeFromFavorites: (productId: string) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== productId),
        }));
      },

      isFavorite: (productId: string) => {
        return get().favorites.includes(productId);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ 
        items: state.items,
        promoCode: state.promoCode,
        shippingAddress: state.shippingAddress,
        telegramUser: state.telegramUser,
        orders: state.orders,
        favorites: state.favorites,
      }),
    }
  )
);

// Selector hooks for better performance
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartItemCount = () => useCartStore((state) => state.getItemCount());
export const useShippingAddress = () => useCartStore((state) => state.shippingAddress);
