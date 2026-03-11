import type { MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

/**
 * Tenant Registry - Mock database of tenant configurations
 * 
 * In production, this would be replaced with:
 * - Database query (PostgreSQL, MongoDB, etc.)
 * - Directus CMS API
 * - External configuration service
 * 
 * For now, this is an in-memory registry for testing multi-tenancy.
 */

// Pizza Shop Configuration (E-commerce)
const pizzaConfig: MiniAppSchemaType = {
  meta: {
    title: "Mario Pizza",
    logo: "/logo-pizza.png",
    locale: "en",
    currency: "USD",
    theme: {
      primaryColor: "#FF6B6B",
      secondaryColor: "#4ECDC4",
    },
    appType: 'ecommerce',
    tenantId: 'pizza-tenant-001',
    slug: 'pizza',
  },
  dataModel: {
    Product: {
      name: "Product",
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        price: { type: "number", required: true },
        image: { type: "string", required: false },
        description: { type: "string", required: false },
        category: { type: "string", required: false },
      },
    },
  },
  pages: [
    {
      id: "home",
      title: "Mario Pizza",
      route: "/",
      components: [
        {
          id: "promo-slider-1",
          type: "PromoSlider",
          props: {
            autoPlay: true,
            autoPlayInterval: 5000,
            height: "md",
            slides: [
              {
                id: "promo-1",
                title: "Fresh Italian Pizza",
                description: "Made with love and authentic ingredients",
                image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
                ctaText: "Order Now",
              },
              {
                id: "promo-2",
                title: "50% Off Second Pizza",
                description: "Every Tuesday",
                image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
                ctaText: "See Menu",
              },
            ],
          },
        },
        {
          id: "product-list-featured",
          type: "ProductList",
          props: {
            title: "Popular Pizzas",
            description: "Our customers' favorites",
            columns: 2,
            limit: 6,
            data: [
              {
                id: "pizza-1",
                name: "Margherita",
                price: 12.99,
                image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400",
                description: "Tomato sauce, mozzarella, fresh basil",
                category: "Pizza",
                badge: "Best Seller",
              },
              {
                id: "pizza-2",
                name: "Pepperoni",
                price: 14.99,
                image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400",
                description: "Pepperoni, mozzarella, tomato sauce",
                category: "Pizza",
              },
              {
                id: "pizza-3",
                name: "Quattro Formaggi",
                price: 16.99,
                image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
                description: "Four cheeses: mozzarella, gorgonzola, parmesan, fontina",
                category: "Pizza",
                badge: "Premium",
              },
              {
                id: "pizza-4",
                name: "Vegetariana",
                price: 13.99,
                image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
                description: "Bell peppers, mushrooms, onions, olives",
                category: "Pizza",
              },
            ],
          },
        },
      ],
    },
    {
      id: "catalog",
      title: "Menu",
      route: "/catalog",
      components: [
        {
          id: "product-list-catalog",
          type: "ProductList",
          props: {
            title: "Full Menu",
            columns: 2,
            enableFiltering: true,
            data: [
              {
                id: "pizza-1",
                name: "Margherita",
                price: 12.99,
                image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400",
                description: "Tomato sauce, mozzarella, fresh basil",
                category: "Pizza",
              },
              {
                id: "pizza-2",
                name: "Pepperoni",
                price: 14.99,
                image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400",
                description: "Pepperoni, mozzarella, tomato sauce",
                category: "Pizza",
              },
              {
                id: "salad-1",
                name: "Caesar Salad",
                price: 9.99,
                image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
                description: "Romaine lettuce, croutons, parmesan",
                category: "Salads",
              },
              {
                id: "pasta-1",
                name: "Carbonara",
                price: 13.99,
                image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400",
                description: "Spaghetti, egg, pecorino, guanciale",
                category: "Pasta",
              },
            ],
          },
        },
      ],
    },
    {
      id: "cart",
      title: "Shopping Cart",
      route: "/cart",
      components: [
        {
          id: "cart-items",
          type: "Cart",
          props: {
            showEmpty: true,
            emptyMessage: "Your cart is empty",
          },
        },
        {
          id: "cart-summary",
          type: "CartSummary",
          props: {
            showSubtotal: true,
            showDiscount: true,
            showTotal: true,
            promoCodeEnabled: true,
            onCheckout: "navigate:checkout",
          },
        },
      ],
    },
    {
      id: "checkout",
      title: "Checkout",
      route: "/checkout",
      components: [
        {
          id: "checkout-form",
          type: "CheckoutForm",
          props: {},
        },
        {
          id: "payment-button",
          type: "PaymentButton",
          props: {
            text: "Pay Now",
            variant: "telegram",
            onPaymentSuccess: "navigate:order-success",
          },
        },
      ],
    },
    {
      id: "order-success",
      title: "Order Confirmed",
      route: "/order-success",
      components: [
        {
          id: "order-success-1",
          type: "OrderSuccess",
          props: {
            orderId: "ORD-123456",
            total: 29.99,
            onContinue: "navigate:home",
          },
        },
      ],
    },
    {
      id: "product-details",
      title: "Product Details",
      route: "/product-details",
      components: [
        {
          id: "product-details-1",
          type: "ProductDetails",
          props: {
            productId: "",
          },
        },
      ],
    },
    {
      id: "orders",
      title: "My Orders",
      route: "/orders",
      components: [
        {
          id: "orders-list",
          type: "OrdersList",
          props: {
            title: "Recent Orders",
            description: "Track and manage your orders",
            showUserOrdersOnly: true,
            onOrderClick: "navigate:order-details",
          },
        },
      ],
    },
    {
      id: "order-details",
      title: "Order Details",
      route: "/order-details",
      components: [
        {
          id: "order-details-1",
          type: "OrderDetails",
          props: {},
        },
      ],
    },
  ],
};

// Barber Shop Configuration (Booking)
const barberConfig: MiniAppSchemaType = {
  meta: {
    title: "Blade & Fade Barbershop",
    logo: "/logo-barber.png",
    locale: "en",
    currency: "USD",
    theme: {
      primaryColor: "#1a1a2e",
      secondaryColor: "#16213e",
    },
    appType: 'booking',
    tenantId: 'barber-tenant-001',
    slug: 'barber',
  },
  dataModel: {
    Service: {
      name: "Service",
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        price: { type: "number", required: true },
        duration: { type: "number", required: false },
        description: { type: "string", required: false },
      },
    },
  },
  pages: [
    {
      id: "home",
      title: "Blade & Fade",
      route: "/",
      components: [
        {
          id: "promo-slider-1",
          type: "PromoSlider",
          props: {
            autoPlay: true,
            autoPlayInterval: 5000,
            height: "md",
            slides: [
              {
                id: "promo-1",
                title: "Professional Haircuts",
                description: "Expert barbers, premium service",
                image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800",
                ctaText: "Book Now",
              },
              {
                id: "promo-2",
                title: "Beard Trim & Style",
                description: "Get the perfect beard look",
                image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800",
                ctaText: "Our Services",
              },
            ],
          },
        },
        {
          id: "product-list-services",
          type: "ProductList",
          props: {
            title: "Our Services",
            description: "Choose your service",
            columns: 2,
            limit: 6,
            data: [
              {
                id: "service-1",
                name: "Classic Haircut",
                price: 35.00,
                image: "https://images.unsplash.com/photo-1503951914875-452162b7f30a?w=400",
                description: "Precision haircut, wash & style",
                category: "Haircut",
                badge: "Popular",
              },
              {
                id: "service-2",
                name: "Beard Trim",
                price: 20.00,
                image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400",
                description: "Beard shaping, trim & oil treatment",
                category: "Beard",
              },
              {
                id: "service-3",
                name: "Full Service",
                price: 50.00,
                image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400",
                description: "Haircut + Beard Trim + Hot Towel",
                category: "Combo",
                badge: "Best Value",
              },
              {
                id: "service-4",
                name: "Kids Haircut",
                price: 25.00,
                image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400",
                description: "Haircut for children under 12",
                category: "Haircut",
              },
            ],
          },
        },
      ],
    },
    {
      id: "catalog",
      title: "Services",
      route: "/catalog",
      components: [
        {
          id: "product-list-catalog",
          type: "ProductList",
          props: {
            title: "All Services",
            columns: 2,
            enableFiltering: true,
            data: [
              {
                id: "service-1",
                name: "Classic Haircut",
                price: 35.00,
                image: "https://images.unsplash.com/photo-1503951914875-452162b7f30a?w=400",
                description: "Precision haircut, wash & style",
                category: "Haircut",
              },
              {
                id: "service-2",
                name: "Beard Trim",
                price: 20.00,
                image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400",
                description: "Beard shaping, trim & oil treatment",
                category: "Beard",
              },
              {
                id: "service-3",
                name: "Full Service",
                price: 50.00,
                image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400",
                description: "Haircut + Beard Trim + Hot Towel",
                category: "Combo",
              },
              {
                id: "service-4",
                name: "Hot Towel Shave",
                price: 30.00,
                image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400",
                description: "Traditional straight razor shave",
                category: "Shave",
              },
            ],
          },
        },
      ],
    },
    {
      id: "cart",
      title: "Your Booking",
      route: "/cart",
      components: [
        {
          id: "cart-items",
          type: "Cart",
          props: {
            showEmpty: true,
            emptyMessage: "No services selected",
          },
        },
        {
          id: "cart-summary",
          type: "CartSummary",
          props: {
            showSubtotal: true,
            showDiscount: false,
            showTotal: true,
            promoCodeEnabled: false,
            onCheckout: "navigate:checkout",
          },
        },
      ],
    },
    {
      id: "checkout",
      title: "Book Appointment",
      route: "/checkout",
      components: [
        {
          id: "checkout-form",
          type: "CheckoutForm",
          props: {},
        },
        {
          id: "payment-button",
          type: "PaymentButton",
          props: {
            text: "Confirm Booking",
            variant: "telegram",
            onPaymentSuccess: "navigate:order-success",
          },
        },
      ],
    },
    {
      id: "order-success",
      title: "Booking Confirmed",
      route: "/order-success",
      components: [
        {
          id: "order-success-1",
          type: "OrderSuccess",
          props: {
            orderId: "BK-123456",
            total: 50.00,
            onContinue: "navigate:home",
          },
        },
      ],
    },
    {
      id: "product-details",
      title: "Service Details",
      route: "/product-details",
      components: [
        {
          id: "product-details-1",
          type: "ProductDetails",
          props: {
            productId: "",
          },
        },
      ],
    },
    {
      id: "orders",
      title: "My Bookings",
      route: "/orders",
      components: [
        {
          id: "orders-list",
          type: "OrdersList",
          props: {
            title: "Upcoming Appointments",
            description: "View and manage your bookings",
            showUserOrdersOnly: true,
            onOrderClick: "navigate:order-details",
          },
        },
      ],
    },
    {
      id: "order-details",
      title: "Booking Details",
      route: "/order-details",
      components: [
        {
          id: "order-details-1",
          type: "OrderDetails",
          props: {},
        },
      ],
    },
  ],
};

// Tenant Registry Map
export const tenantRegistry: Record<string, MiniAppSchemaType> = {
  pizza: pizzaConfig,
  barber: barberConfig,
};

// Get all available tenant slugs
export function getAvailableTenants(): string[] {
  return Object.keys(tenantRegistry);
}

// Get tenant config by slug
export function getTenantConfig(slug: string): MiniAppSchemaType | null {
  return tenantRegistry[slug] || null;
}

// Check if tenant exists
export function tenantExists(slug: string): boolean {
  return slug in tenantRegistry;
}
