'use client';

import { registerComponent } from '@/lib/renderer/component-registry';
import { Screen } from './core/screen';
import { Header } from './core/header';
import { Modal } from './core/modal';
import { BottomNav } from './core/bottom-nav';
import { ProductCard } from './ecommerce/product-card';
import { ProductList } from './ecommerce/product-list';
import { PromoSlider } from './ecommerce/promo-slider';
import { Cart } from './ecommerce/cart';
import { CartSummary } from './ecommerce/cart-summary';
import { CheckoutForm } from './ecommerce/checkout-form';
import { PaymentButton } from './ecommerce/payment-button';
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
  
  console.log('Components initialized:', [
    'Screen', 'Header', 'Modal', 'BottomNav',
    'ProductCard', 'ProductList', 'PromoSlider',
    'Cart', 'CartSummary', 'CheckoutForm', 'PaymentButton'
  ]);
}

// Export all components for direct import
export { Screen } from './core/screen';
export { Header } from './core/header';
export { Modal } from './core/modal';
export { BottomNav } from './core/bottom-nav';
export { ProductCard } from './ecommerce/product-card';
export { ProductList } from './ecommerce/product-list';
export { PromoSlider } from './ecommerce/promo-slider';
export { Cart } from './ecommerce/cart';
export { CartSummary } from './ecommerce/cart-summary';
export { CheckoutForm } from './ecommerce/checkout-form';
export { PaymentButton, PaymentStatus } from './ecommerce/payment-button';
