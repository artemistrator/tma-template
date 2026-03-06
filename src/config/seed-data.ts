import { Product } from '@/store/cart-store';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Earbuds Pro',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    description: 'Premium wireless earbuds with active noise cancellation',
    category: 'Audio',
  },
  {
    id: '2',
    name: 'Smart Watch Series 5',
    price: 399.99,
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400',
    description: 'Advanced smartwatch with health monitoring',
    category: 'Wearables',
  },
  {
    id: '3',
    name: 'Portable Power Bank',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
    description: '20000mAh fast charging power bank',
    category: 'Accessories',
  },
  {
    id: '4',
    name: 'Bluetooth Speaker',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    description: 'Waterproof portable speaker with 360° sound',
    category: 'Audio',
  },
  {
    id: '5',
    name: 'USB-C Hub Multiport',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1625841442290-98c949728613?w=400',
    description: '7-in-1 USB-C hub with HDMI and SD card reader',
    category: 'Accessories',
  },
  {
    id: '6',
    name: 'Mechanical Keyboard',
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400',
    description: 'RGB mechanical keyboard with Cherry MX switches',
    category: 'Peripherals',
  },
  {
    id: '7',
    name: 'Wireless Mouse',
    price: 69.99,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    description: 'Ergonomic wireless mouse with precision tracking',
    category: 'Peripherals',
  },
  {
    id: '8',
    name: 'Laptop Stand',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400',
    description: 'Adjustable aluminum laptop stand',
    category: 'Accessories',
  },
];

export const mockPromos = [
  {
    id: 'promo-1',
    title: 'Summer Sale',
    description: 'Up to 50% off on selected items',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
    backgroundColor: '#FF6B6B',
    ctaText: 'Shop Now',
  },
  {
    id: 'promo-2',
    title: 'New Arrivals',
    description: 'Check out the latest tech gadgets',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
    backgroundColor: '#4ECDC4',
    ctaText: 'Explore',
  },
  {
    id: 'promo-3',
    title: 'Free Shipping',
    description: 'On orders over $100',
    backgroundColor: '#45B7D1',
  },
];

export const mockCategories = [
  { id: 'audio', name: 'Audio', count: 24 },
  { id: 'wearables', name: 'Wearables', count: 18 },
  { id: 'accessories', name: 'Accessories', count: 42 },
  { id: 'peripherals', name: 'Peripherals', count: 31 },
];

export const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
};

export const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  items: [
    { productId: '1', quantity: 1, price: 149.99 },
    { productId: '3', quantity: 2, price: 49.99 },
  ],
  total: 249.97,
  status: 'pending',
  createdAt: '2024-01-15T10:30:00Z',
};
