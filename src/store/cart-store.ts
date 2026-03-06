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

interface CartState {
  items: CartItem[];
  shippingAddress: ShippingAddress | null;
  promoCode: string | null;
  total: number;
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setShippingAddress: (address: ShippingAddress) => void;
  applyPromoCode: (code: string) => void;
  calculateTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      shippingAddress: null,
      promoCode: null,
      total: 0,

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
        
        // Recalculate total
        get().calculateTotal();
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
        
        // Recalculate total
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
        
        // Recalculate total
        get().calculateTotal();
      },

      clearCart: () => {
        set({ items: [], promoCode: null, total: 0 });
      },

      setShippingAddress: (address: ShippingAddress) => {
        set({ shippingAddress: address });
      },

      applyPromoCode: (code: string) => {
        set({ promoCode: code });
        // Promo code logic can be extended with API validation
        get().calculateTotal();
      },

      calculateTotal: () => {
        const state = get();
        const subtotal = state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        
        // Apply promo code discount if valid (extend with API validation)
        const discount = state.promoCode ? subtotal * 0.1 : 0; // 10% discount example
        
        const total = subtotal - discount;
        
        set({ total: Math.round(total * 100) / 100 });
        
        return total;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ 
        items: state.items,
        promoCode: state.promoCode,
        shippingAddress: state.shippingAddress,
      }),
    }
  )
);

// Selector hooks for better performance
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartItemCount = () => useCartStore((state) => state.getItemCount());
export const useShippingAddress = () => useCartStore((state) => state.shippingAddress);
