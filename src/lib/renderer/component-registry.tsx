import React from 'react';
import { ComponentInstance } from '@/lib/schema/mini-app-schema';
import { ComponentErrorBoundary } from '@/components/core/error-boundary';

// Component type mapping
export type ComponentType =
  | 'Screen'
  | 'Header'
  | 'BottomNav'
  | 'Modal'
  | 'ProductCard'
  | 'ProductList'
  | 'PromoSlider'
  | 'Cart'
  | 'CartSummary'
  | 'CheckoutForm'
  | 'PaymentButton'
  | 'OrderSuccess'
  | 'OrderFailed'
  | 'OrdersList'
  | 'OrderDetails'
  | 'ProductDetails'
  | 'SearchBar'
  | 'FilterPanel'
  | 'CategoryGrid'
  // Booking module
  | 'ServiceList'
  | 'BookingCheckoutForm'
  | 'BookingSuccess'
  | 'BookingCalendar'
  | 'TimeSlots'
  | 'StaffList'
  | 'WorkingHours'
  // Infobiz module
  | 'InfoProductList'
  | 'InfoProductDetails'
  | 'LeadCaptureForm'
  | 'InfobizCheckout'
  | 'AuthorBio'
  | 'StatsRow'
  | 'FaqAccordion'
  // Shared marketing components
  | 'HeroBanner'
  | 'FeaturesList'
  | 'Testimonials'
  | 'RichText'
  | 'BannerCta'
  | 'ContactsBlock'
  | 'StickyCtaBar'
  // Reviews
  | 'ReviewsList'
  | 'ReviewSummary'
  // Assistant
  | 'FloatingAssistantButton'
  | 'Button'
  | 'Input'
  | 'List'
  | 'Card';

export interface ComponentFactoryProps {
  type?: ComponentType;
  props?: Record<string, unknown>;
  binding?: {
    source?: string;
    transform?: string;
    filter?: string;
  };
  children?: React.ReactNode;
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
}

// Registry map - will be populated as components are created
const componentRegistry = new Map<ComponentType, React.ComponentType<ComponentFactoryProps>>();

/**
 * Register a component in the factory
 */
export function registerComponent(
  type: ComponentType,
  component: React.ComponentType<ComponentFactoryProps>
) {
  componentRegistry.set(type, component);
}

/**
 * Get a component from the factory
 */
export function getComponent(type: ComponentType): React.ComponentType<ComponentFactoryProps> | null {
  return componentRegistry.get(type) || null;
}

/**
 * Check if a component is registered
 */
export function hasComponent(type: ComponentType): boolean {
  return componentRegistry.has(type);
}

/**
 * Get all registered component types
 */
export function getRegisteredComponents(): ComponentType[] {
  return Array.from(componentRegistry.keys());
}

/**
 * Fallback UI for components whose `type` is not found in the registry.
 * In production this renders nothing (invisible to end users).
 * In development it shows a visible placeholder for debugging.
 */
function UnknownComponentFallback({ type }: { type?: string }) {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="p-3 my-2 text-center text-xs rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground">
      Unknown component: &quot;{type}&quot;
    </div>
  );
}

/**
 * Dynamic component renderer — wraps every component in an ErrorBoundary
 * so that a crash in one component does not take down the entire page.
 */
export function DynamicComponent({ type, props = {}, binding, children, id, className, onNavigate }: ComponentFactoryProps) {
  const Component = componentRegistry.get(type as ComponentType);

  if (!Component) {
    console.warn(`Component "${type}" is not registered in the factory`);
    return <UnknownComponentFallback type={type} />;
  }

  return (
    <ComponentErrorBoundary componentType={type} componentId={id}>
      <Component
        id={id}
        type={type}
        props={props}
        binding={binding}
        className={className}
        onNavigate={onNavigate}
      >
        {children}
      </Component>
    </ComponentErrorBoundary>
  );
}

/**
 * Render a list of components from schema
 */
export function renderComponents(components: ComponentInstance[] | undefined, dataContext?: Record<string, unknown>, onNavigate?: (pageId: string) => void) {
  if (!components || !Array.isArray(components) || components.length === 0) {
    return null;
  }

  return components.map((component, index) => {
    // Resolve data binding if present
    let resolvedProps = component.props || {};

    if (component.binding && dataContext) {
      const dataSource = dataContext[component.binding.source];
      if (dataSource) {
        resolvedProps = {
          ...resolvedProps,
          data: dataSource,
        };
      }
    }

    return (
      <DynamicComponent
        key={component.id || `${component.type}-${index}`}
        type={component.type as ComponentType}
        props={resolvedProps}
        binding={component.binding}
        id={component.id}
        onNavigate={onNavigate}
      >
        {component.children && Array.isArray(component.children) ? renderComponents(component.children, dataContext, onNavigate) : null}
      </DynamicComponent>
    );
  });
}
