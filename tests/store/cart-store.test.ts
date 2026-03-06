import { useCartStore } from '@/store/cart-store';

describe('Cart Store', () => {
  beforeEach(() => {
    // Clear cart before each test
    useCartStore.getState().clearCart();
  });

  describe('addItem', () => {
    it('adds a new item to cart', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        price: 49.99,
      };

      useCartStore.getState().addItem(product);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(expect.objectContaining(product));
      expect(items[0].quantity).toBe(1);
    });

    it('increases quantity for existing item', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        price: 49.99,
      };

      useCartStore.getState().addItem(product);
      useCartStore.getState().addItem(product);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('adds item with custom quantity', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        price: 49.99,
      };

      useCartStore.getState().addItem(product, 5);

      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('removes item from cart', () => {
      useCartStore.getState().addItem({
        id: '1',
        name: 'Test Product',
        price: 49.99,
      });

      useCartStore.getState().removeItem('1');

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(0);
    });

    it('does not remove other items', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product 1', price: 10 });
      useCartStore.getState().addItem({ id: '2', name: 'Product 2', price: 20 });

      useCartStore.getState().removeItem('1');

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('2');
    });
  });

  describe('updateQuantity', () => {
    it('updates item quantity', () => {
      useCartStore.getState().addItem({
        id: '1',
        name: 'Test Product',
        price: 49.99,
      });

      useCartStore.getState().updateQuantity('1', 5);

      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });

    it('removes item when quantity is 0 or less', () => {
      useCartStore.getState().addItem({
        id: '1',
        name: 'Test Product',
        price: 49.99,
      });

      useCartStore.getState().updateQuantity('1', 0);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(0);
    });
  });

  describe('calculateTotal', () => {
    it('calculates correct total', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product 1', price: 10 }, 2);
      useCartStore.getState().addItem({ id: '2', name: 'Product 2', price: 20 }, 1);

      const total = useCartStore.getState().calculateTotal();

      expect(total).toBe(40);
    });

    it('applies 10% discount when promo code is applied', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product 1', price: 100 });
      useCartStore.getState().applyPromoCode('SAVE10');

      const total = useCartStore.getState().calculateTotal();

      expect(total).toBe(90);
    });
  });

  describe('getItemCount', () => {
    it('returns total item count', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product 1', price: 10 }, 2);
      useCartStore.getState().addItem({ id: '2', name: 'Product 2', price: 20 }, 3);

      const count = useCartStore.getState().getItemCount();

      expect(count).toBe(5);
    });

    it('returns 0 for empty cart', () => {
      const count = useCartStore.getState().getItemCount();
      expect(count).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items from cart', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product 1', price: 10 });
      useCartStore.getState().addItem({ id: '2', name: 'Product 2', price: 20 });

      useCartStore.getState().clearCart();

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(0);
    });

    it('resets total to 0', () => {
      useCartStore.getState().addItem({ id: '1', name: 'Product 1', price: 10 });
      useCartStore.getState().clearCart();

      const total = useCartStore.getState().total;
      expect(total).toBe(0);
    });
  });

  describe('applyPromoCode', () => {
    it('sets promo code', () => {
      useCartStore.getState().applyPromoCode('SAVE10');

      const promoCode = useCartStore.getState().promoCode;
      expect(promoCode).toBe('SAVE10');
    });

    it('can be cleared by applying empty code', () => {
      useCartStore.getState().applyPromoCode('SAVE10');
      useCartStore.getState().applyPromoCode('');

      const promoCode = useCartStore.getState().promoCode;
      expect(promoCode).toBe('');
    });
  });

  describe('setShippingAddress', () => {
    it('sets shipping address', () => {
      const address = {
        name: 'John Doe',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        zipCode: '10001',
        country: 'USA',
      };

      useCartStore.getState().setShippingAddress(address);

      const storedAddress = useCartStore.getState().shippingAddress;
      expect(storedAddress).toEqual(address);
    });
  });
});
