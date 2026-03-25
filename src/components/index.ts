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
import { CategoryGrid } from '@/modules/ecommerce/components/category-grid';
import { ServiceList } from '@/modules/booking/components/ServiceList';
import { BookingCheckoutForm } from '@/modules/booking/components/BookingCheckoutForm';
import { BookingSuccess } from '@/modules/booking/components/BookingSuccess';
import { BookingCalendar } from '@/modules/booking/components/BookingCalendar';
import { TimeSlots } from '@/modules/booking/components/TimeSlots';
import { StaffList } from '@/modules/booking/components/StaffList';
import { WorkingHours } from '@/modules/booking/components/WorkingHours';
import { InfoProductList } from '@/modules/infobiz/components/InfoProductList';
import { InfoProductDetails } from '@/modules/infobiz/components/InfoProductDetails';
import { LeadCaptureForm } from '@/modules/infobiz/components/LeadCaptureForm';
import { InfobizCheckout } from '@/modules/infobiz/components/InfobizCheckout';
import { AuthorBio } from '@/modules/infobiz/components/AuthorBio';
import { StatsRow } from '@/modules/infobiz/components/StatsRow';
import { FaqAccordion } from '@/modules/infobiz/components/FaqAccordion';
import { HeroBanner } from '@/modules/shared/components/HeroBanner';
import { FeaturesList } from '@/modules/shared/components/FeaturesList';
import { Testimonials } from '@/modules/shared/components/Testimonials';
import { RichText } from '@/modules/shared/components/RichText';
import { BannerCta } from '@/modules/shared/components/BannerCta';
import { ContactsBlock } from '@/modules/shared/components/ContactsBlock';
import { StickyCtaBar } from '@/modules/shared/components/StickyCtaBar';
import { ReviewsList } from '@/modules/shared/components/ReviewsList';
import { ReviewSummary } from '@/modules/shared/components/ReviewSummary';
import { FloatingAssistantButton } from '@/modules/shared/components/FloatingAssistantButton';
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
  registerComponent('CategoryGrid', CategoryGrid as unknown as React.ComponentType<ComponentFactoryProps>);

  // Booking components
  registerComponent('ServiceList', ServiceList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BookingCheckoutForm', BookingCheckoutForm as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BookingSuccess', BookingSuccess as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BookingCalendar', BookingCalendar as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('TimeSlots', TimeSlots as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('StaffList', StaffList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('WorkingHours', WorkingHours as unknown as React.ComponentType<ComponentFactoryProps>);

  // Infobiz components
  registerComponent('InfoProductList', InfoProductList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('InfoProductDetails', InfoProductDetails as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('LeadCaptureForm', LeadCaptureForm as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('InfobizCheckout', InfobizCheckout as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('AuthorBio', AuthorBio as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('StatsRow', StatsRow as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('FaqAccordion', FaqAccordion as unknown as React.ComponentType<ComponentFactoryProps>);

  // Shared marketing components
  registerComponent('HeroBanner', HeroBanner as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('FeaturesList', FeaturesList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('Testimonials', Testimonials as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('RichText', RichText as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('BannerCta', BannerCta as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('ContactsBlock', ContactsBlock as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('StickyCtaBar', StickyCtaBar as unknown as React.ComponentType<ComponentFactoryProps>);

  // Reviews
  registerComponent('ReviewsList', ReviewsList as unknown as React.ComponentType<ComponentFactoryProps>);
  registerComponent('ReviewSummary', ReviewSummary as unknown as React.ComponentType<ComponentFactoryProps>);

  // Assistant
  registerComponent('FloatingAssistantButton', FloatingAssistantButton as unknown as React.ComponentType<ComponentFactoryProps>);

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
export { CategoryGrid } from '@/modules/ecommerce/components/category-grid';

// Booking module exports
export { ServiceList } from '@/modules/booking/components/ServiceList';
export { BookingCheckoutForm } from '@/modules/booking/components/BookingCheckoutForm';
export { BookingSuccess } from '@/modules/booking/components/BookingSuccess';
export { BookingCalendar } from '@/modules/booking/components/BookingCalendar';
export { TimeSlots } from '@/modules/booking/components/TimeSlots';
export { StaffList } from '@/modules/booking/components/StaffList';
export { WorkingHours } from '@/modules/booking/components/WorkingHours';

// Infobiz module exports
export { InfoProductList } from '@/modules/infobiz/components/InfoProductList';
export { InfoProductDetails } from '@/modules/infobiz/components/InfoProductDetails';
export { LeadCaptureForm } from '@/modules/infobiz/components/LeadCaptureForm';
export { InfobizCheckout } from '@/modules/infobiz/components/InfobizCheckout';
export { AuthorBio } from '@/modules/infobiz/components/AuthorBio';
export { StatsRow } from '@/modules/infobiz/components/StatsRow';
export { FaqAccordion } from '@/modules/infobiz/components/FaqAccordion';

// Shared marketing components
export { HeroBanner } from '@/modules/shared/components/HeroBanner';
export { FeaturesList } from '@/modules/shared/components/FeaturesList';
export { Testimonials } from '@/modules/shared/components/Testimonials';
export { RichText } from '@/modules/shared/components/RichText';
export { BannerCta } from '@/modules/shared/components/BannerCta';
export { ContactsBlock } from '@/modules/shared/components/ContactsBlock';
export { StickyCtaBar } from '@/modules/shared/components/StickyCtaBar';

// Reviews
export { ReviewsList } from '@/modules/shared/components/ReviewsList';
export { ReviewSummary } from '@/modules/shared/components/ReviewSummary';

// Assistant
export { FloatingAssistantButton } from '@/modules/shared/components/FloatingAssistantButton';
