import React from 'react';
import { ComponentInstance } from '@/lib/schema/mini-app-schema';

// Component type mapping
export type ComponentType = 
  | 'Screen'
  | 'Header'
  | 'ProductCard'
  | 'ProductList'
  | 'PromoSlider'
  | 'Cart'
  | 'CartSummary'
  | 'CheckoutForm'
  | 'PaymentButton'
  | 'Modal'
  | 'Button'
  | 'Input'
  | 'List'
  | 'Card';

export interface ComponentFactoryProps {
  type: ComponentType;
  props?: Record<string, unknown>;
  binding?: {
    source?: string;
    transform?: string;
    filter?: string;
  };
  children?: React.ReactNode;
  id?: string;
  className?: string;
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
 * Dynamic component renderer
 */
export function DynamicComponent({ type, props = {}, binding, children, id, className }: ComponentFactoryProps) {
  const Component = componentRegistry.get(type as ComponentType);

  if (!Component) {
    console.warn(`Component "${type}" is not registered in the factory`);
    return (
      <div className="p-4 text-center text-red-500 border border-red-200 rounded">
        Component &quot;{type}&quot; not found
      </div>
    );
  }

  return (
    <Component
      id={id}
      type={type}
      props={props}
      binding={binding}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * Render a list of components from schema
 */
export function renderComponents(components: ComponentInstance[] | undefined, dataContext?: Record<string, unknown>) {
  if (!components || components.length === 0) {
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
      >
        {component.children ? renderComponents(component.children, dataContext) : undefined}
      </DynamicComponent>
    );
  });
}
