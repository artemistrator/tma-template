'use client';

import { registerComponent } from '@/lib/renderer/component-registry';
import { Screen } from './core/screen';
import { Header } from './core/header';
import { Modal } from './core/modal';
import { BottomNav } from './core/bottom-nav';
import { ProductCard } from '@/modules/ecommerce/components/product-card';
import { ProductList } from '@/modules/ecommerce/components/product-list';
import { PromoSlider } from '@/modules/ecommerce/components/promo-slider';
import { Cart } from '@/modules/ecommerce/components/cart';
import { CartSummary } from '@/modules/ecommerce/components/cart-summary';
import { CheckoutForm } from '@/modules/ecommerce/components/checkout-form';
import { PaymentButton } from '@/modules/ecommerce/components/payment-button';
import { OrderSuccess } from '@/modules/ecommerce/components/order-success';
import { OrderFailed } from '@/modules/ecommerce/components/order-failed';
import { OrdersList } from '@/modules/ecommerce/components/orders-list';
import { OrderDetails } from '@/modules/ecommerce/components/order-details';
import { ProductDetails } from '@/modules/ecommerce/components/product-details';
import { SearchBar } from '@/modules/ecommerce/components/search-bar';
import { FilterPanel } from '@/modules/ecommerce/components/filter-panel';
import { ServiceList } from '@/modules/booking/components/ServiceList';
import { BookingCheckoutForm } from '@/modules/booking/components/BookingCheckoutForm';
import { BookingCalendar } from '@/modules/booking/components/BookingCalendar';
import { TimeSlots } from '@/modules/booking/components/TimeSlots';
import type { ComponentFactoryProps } from '@/lib/renderer/component-registry';

/**
 * Initialize and register all components in the factory
 * Call this once at app initialization
 */
export function initializeComponents() {
  // Core components
  registerComponent('Screen', Screen as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('Header', Header as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('Modal', Modal as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BottomNav', BottomNav as unknown as React.ComponentType<ComponentFactoryProps>);

  // E-commerce components
  registerComponent('ProductCard', ProductCard as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('ProductList', ProductList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('PromoSlider', PromoSlider as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('Cart', Cart as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('CartSummary', CartSummary as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('CheckoutForm', CheckoutForm as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('PaymentButton', PaymentButton as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('OrderSuccess', OrderSuccess as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('OrderFailed', OrderFailed as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('OrdersList', OrdersList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('OrderDetails', OrderDetails as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('ProductDetails', ProductDetails as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('SearchBar', SearchBar as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('FilterPanel', FilterPanel as unknown as React.ComponentType<ComponentFactoryProps>);

  // Booking components
  registerComponent('ServiceList', ServiceList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BookingCheckoutForm', BookingCheckoutForm as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BookingCalendar', BookingCalendar as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('TimeSlots', TimeSlots as unknown as React.ComponentType<ComponentFactoryProps>);

  console.log('Components initialized:', [
  'Screen', 'Header', 'Modal', 'BottomNav',
  'ProductCard', 'ProductList', 'PromoSlider',
  'Cart', 'CartSummary', 'CheckoutForm', 'PaymentButton',
  'OrderSuccess', 'OrderFailed', 'OrdersList', 'OrderDetails', 'ProductDetails', 'SearchBar', 'FilterPanel',
  'ServiceList', 'BookingCheckoutForm', 'BookingCalendar', 'TimeSlots'
  ]);
}

// Export all components for direct import
export { Screen } from './core/screen';
export { Header } from './core/header';
export { Modal } from './core/modal';
export { BottomNav } from './core/bottom-nav';

// E-commerce module exports
export { ProductCard } from '@/modules/ecommerce/components/product-card';
export { ProductList } from '@/modules/ecommerce/components/product-list';
export { PromoSlider } from '@/modules/ecommerce/components/promo-slider';
export { Cart } from '@/modules/ecommerce/components/cart';
export { CartSummary } from '@/modules/ecommerce/components/cart-summary';
export { CheckoutForm } from '@/modules/ecommerce/components/checkout-form';
export { PaymentButton, PaymentStatus } from '@/modules/ecommerce/components/payment-button';
export { OrderSuccess } from '@/modules/ecommerce/components/order-success';
export { OrderFailed } from '@/modules/ecommerce/components/order-failed';
export { OrdersList } from '@/modules/ecommerce/components/orders-list';
export { OrderDetails } from '@/modules/ecommerce/components/order-details';
export { ProductDetails } from '@/modules/ecommerce/components/product-details';
export { SearchBar } from '@/modules/ecommerce/components/search-bar';
export { FilterPanel } from '@/modules/ecommerce/components/filter-panel';

// Booking module exports
export { ServiceList } from '@/modules/booking/components/ServiceList';
export { BookingCheckoutForm } from '@/modules/booking/components/BookingCheckoutForm';
export { BookingCalendar } from '@/modules/booking/components/BookingCalendar';
export { TimeSlots } from '@/modules/booking/components/TimeSlots';
