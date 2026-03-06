import { useCartStore } from '@/store/cart-store';

describe('Cart Store - Extended', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  describe('Telegram User', () => {
    it('sets telegram user', () => {
      const user = {
        id: 123,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
      };

      useCartStore.getState().setTelegramUser(user);

      const storedUser = useCartStore.getState().telegramUser;
      expect(storedUser).toEqual(user);
    });

    it('returns full name', () => {
      useCartStore.getState().setTelegramUser({
        firstName: 'John',
        lastName: 'Doe',
      });

      const state = useCartStore.getState();
      const parts = [state.telegramUser?.firstName, state.telegramUser?.lastName].filter(Boolean);
      expect(parts.join(' ')).toBe('John Doe');
    });
  });

  describe('Favorites', () => {
    it('adds product to favorites', () => {
      useCartStore.getState().addToFavorites('product-1');

      const favorites = useCartStore.getState().favorites;
      expect(favorites).toContain('product-1');
    });

    it('removes product from favorites', () => {
      useCartStore.getState().addToFavorites('product-1');
      useCartStore.getState().removeFromFavorites('product-1');

      const favorites = useCartStore.getState().favorites;
      expect(favorites).not.toContain('product-1');
    });

    it('checks if product is favorite', () => {
      useCartStore.getState().addToFavorites('product-1');

      expect(useCartStore.getState().isFavorite('product-1')).toBe(true);
      expect(useCartStore.getState().isFavorite('product-2')).toBe(false);
    });
  });

  describe('Orders', () => {
    it('adds order', () => {
      const order = {
        id: 'order-1',
        items: [{ id: '1', name: 'Product', price: 10, quantity: 1 }],
        total: 10,
        shippingAddress: {
          name: 'Test',
          phone: '123',
          address: 'Test St',
          city: 'Test',
          zipCode: '123',
          country: 'Test',
        },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      useCartStore.getState().addOrder(order);

      const orders = useCartStore.getState().orders;
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('order-1');
    });

    it('clears cart after order', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product', price: 10 });
      
      const order = {
        id: 'order-1',
        items: [],
        total: 0,
        shippingAddress: {} as any,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      useCartStore.getState().addOrder(order);

      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().total).toBe(0);
    });

    it('returns orders', () => {
      const orders = useCartStore.getState().getOrders();
      expect(Array.isArray(orders)).toBe(true);
    });
  });
});
