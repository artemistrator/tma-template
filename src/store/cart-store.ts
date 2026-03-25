import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
  stockQuantity?: number; // -1 = unlimited, 0 = out of stock, >0 = limited
}

export interface CartItem extends Product {
  quantity: number;
  variantId?: string;
  variantName?: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  email?: string;
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

/** Delivery info stored in cart & order */
export interface DeliveryInfo {
  method: string; // 'pickup' | 'courier' | 'cdek'
  optionId: string; // DeliveryOption.id
  price: number;
  name: string;
  pickupPointId?: string;
  pickupPointName?: string;
  pickupPointAddress?: string;
  estimatedDays?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  shippingAddress: ShippingAddress;
  telegramUser?: TelegramUser;
  delivery?: DeliveryInfo;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  // Booking-specific fields
  bookingDate?: string; // ISO datetime string of the appointment
  bookingTime?: string; // "HH:MM" selected time
  bookingService?: string; // service name
}

interface CartState {
  items: CartItem[];
  shippingAddress: ShippingAddress | null;
  telegramUser: TelegramUser | null;
  promoCode: string | null;
  discountAmount: number; // exact discount amount from validated promo
  delivery: DeliveryInfo | null;
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
  setDelivery: (delivery: DeliveryInfo | null) => void;
  applyPromoCode: (code: string, discountAmount?: number) => void;
  removePromo: () => void;
  calculateTotal: () => number;
  getItemCount: () => number;

  // Order actions
  addOrder: (order: Order) => void;
  getOrders: () => Order[];
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  // Favorites
  addToFavorites: (productId: string) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

// Create storage with tenant-aware key
const createTenantStorage = () => {
  return {
    getItem: (name: string) => {
      if (typeof window === 'undefined') return null;
      const tenantId = window.location.search.match(/[?&]tenant=([^&]+)/)?.[1] || 'default';
      const stored = localStorage.getItem(`${name}_${tenantId}`);
      return stored ? JSON.parse(stored) : null;
    },
    setItem: (name: string, value: unknown) => {
      if (typeof window === 'undefined') return;
      const tenantId = window.location.search.match(/[?&]tenant=([^&]+)/)?.[1] || 'default';
      localStorage.setItem(`${name}_${tenantId}`, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      if (typeof window === 'undefined') return;
      const tenantId = window.location.search.match(/[?&]tenant=([^&]+)/)?.[1] || 'default';
      localStorage.removeItem(`${name}_${tenantId}`);
    },
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      shippingAddress: null,
      telegramUser: null,
      promoCode: null,
      discountAmount: 0,
      delivery: null,
      total: 0,
      orders: [],
      favorites: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          const limit = product.stockQuantity && product.stockQuantity > 0 ? product.stockQuantity : Infinity;

          if (existingItem) {
            const newQty = Math.min(existingItem.quantity + quantity, limit);
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: newQty }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { ...product, quantity: Math.min(quantity, limit) }],
          };
        });

        // Recalculate total
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
          items: state.items.map((item) => {
            if (item.id !== productId) return item;
            const limit = item.stockQuantity && item.stockQuantity > 0 ? item.stockQuantity : Infinity;
            return { ...item, quantity: Math.min(quantity, limit) };
          }),
        }));
        
        get().calculateTotal();
      },

      clearCart: () => {
        set({ items: [], promoCode: null, discountAmount: 0, delivery: null, total: 0 });
      },

      setShippingAddress: (address: ShippingAddress) => {
        set({ shippingAddress: address });
      },

      setTelegramUser: (user: TelegramUser) => {
        set({ telegramUser: user });
      },

      setDelivery: (delivery: DeliveryInfo | null) => {
        set({ delivery });
        get().calculateTotal();
      },

      applyPromoCode: (code: string, discountAmount?: number) => {
        set({ promoCode: code, discountAmount: discountAmount ?? 0 });
        get().calculateTotal();
      },

      removePromo: () => {
        set({ promoCode: null, discountAmount: 0 });
        get().calculateTotal();
      },

      calculateTotal: () => {
        const state = get();
        const subtotal = state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const discount = state.discountAmount > 0 ? state.discountAmount : 0;
        const deliveryPrice = state.delivery?.price || 0;
        const total = Math.max(0, subtotal - discount + deliveryPrice);

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

      updateOrderStatus: (orderId: string, status: Order['status']) => {
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { ...o, status } : o),
        }));
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
      storage: createJSONStorage(() => createTenantStorage()),
      partialize: (state) => ({
        items: state.items,
        promoCode: state.promoCode,
        discountAmount: state.discountAmount,
        delivery: state.delivery,
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
