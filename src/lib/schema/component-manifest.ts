/**
 * Component Manifest — machine-readable catalog of all registered components.
 * Used by the orchestrator to understand what components are available,
 * their props, and how to compose them into a working app.
 */

export interface PropDef {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  description: string;
  required?: boolean;
  enumValues?: string[];
  default?: unknown;
  /** For array items — shape of each element */
  items?: Record<string, PropDef>;
}

export interface ComponentManifestEntry {
  name: string;
  module: 'shared' | 'ecommerce' | 'booking' | 'infobiz';
  description: string;
  compatibleWith: Array<'ecommerce' | 'booking' | 'infobiz'>;
  props: Record<string, PropDef>;
  example: Record<string, unknown>;
}

export const COMPONENT_MANIFEST: Record<string, ComponentManifestEntry> = {

  // ─── SHARED ──────────────────────────────────────────────────────────

  HeroBanner: {
    name: 'HeroBanner',
    module: 'shared',
    description: 'Full-width hero section with title, subtitle, background image/color, and CTA button.',
    compatibleWith: ['ecommerce', 'booking', 'infobiz'],
    props: {
      title: { type: 'string', description: 'Main heading', required: true },
      subtitle: { type: 'string', description: 'Value proposition text' },
      backgroundImage: { type: 'string', description: 'Background image URL' },
      backgroundColor: { type: 'string', description: 'Hex fallback color, e.g. "#6366f1"' },
      overlayOpacity: { type: 'number', description: 'Dark overlay 0-100', default: 40 },
      textColor: { type: 'string', description: 'Text color', default: 'white' },
      align: { type: 'enum', description: 'Text alignment', enumValues: ['left', 'center'], default: 'center' },
      minHeight: { type: 'string', description: 'CSS min-height', default: '260px' },
      ctaText: { type: 'string', description: 'CTA button label' },
      ctaPage: { type: 'string', description: 'Target page ID on click' },
      ctaVariant: { type: 'enum', description: 'Button style', enumValues: ['primary', 'outline', 'white'], default: 'white' },
    },
    example: {
      type: 'HeroBanner',
      props: { title: 'Welcome', subtitle: 'Order in a tap', backgroundColor: '#c0392b', ctaText: 'Shop now →', ctaPage: 'catalog' },
    },
  },

  FeaturesList: {
    name: 'FeaturesList',
    module: 'shared',
    description: '"Why choose us" advantages grid with icons, titles, and descriptions.',
    compatibleWith: ['ecommerce', 'booking', 'infobiz'],
    props: {
      title: { type: 'string', description: 'Section title' },
      subtitle: { type: 'string', description: 'Section subtitle' },
      columns: { type: 'enum', description: 'Grid columns', enumValues: ['1', '2', '3'], default: 2 },
      layout: { type: 'enum', description: 'Layout style', enumValues: ['cards', 'list'], default: 'cards' },
      iconSize: { type: 'enum', description: 'Icon size', enumValues: ['sm', 'md', 'lg'], default: 'md' },
      items: {
        type: 'array', description: 'Features list', required: true,
        items: {
          icon: { type: 'string', description: 'Emoji or icon', required: true },
          title: { type: 'string', description: 'Feature title', required: true },
          description: { type: 'string', description: 'Feature description' },
        },
      },
    },
    example: {
      type: 'FeaturesList',
      props: { title: 'Why us', columns: 2, items: [{ icon: '🚀', title: 'Fast', description: '30 min delivery' }] },
    },
  },

  Testimonials: {
    name: 'Testimonials',
    module: 'shared',
    description: 'Customer/student review cards with optional star ratings.',
    compatibleWith: ['ecommerce', 'booking', 'infobiz'],
    props: {
      title: { type: 'string', description: 'Section title' },
      subtitle: { type: 'string', description: 'Section subtitle' },
      layout: { type: 'enum', description: 'Layout style', enumValues: ['cards', 'compact'], default: 'cards' },
      items: {
        type: 'array', description: 'Testimonials list', required: true,
        items: {
          name: { type: 'string', description: 'Reviewer name', required: true },
          role: { type: 'string', description: 'Job title or role' },
          avatar: { type: 'string', description: 'Avatar image URL' },
          rating: { type: 'number', description: 'Star rating 1-5' },
          text: { type: 'string', description: 'Review text', required: true },
        },
      },
    },
    example: {
      type: 'Testimonials',
      props: { title: 'Reviews', items: [{ name: 'Anna K.', rating: 5, text: 'Great service!' }] },
    },
  },

  RichText: {
    name: 'RichText',
    module: 'shared',
    description: 'Freeform text block with basic markdown support (headings, bold, italic).',
    compatibleWith: ['ecommerce', 'booking', 'infobiz'],
    props: {
      content: { type: 'string', description: 'Markdown content', required: true },
      align: { type: 'enum', description: 'Text alignment', enumValues: ['left', 'center', 'right'], default: 'left' },
      size: { type: 'enum', description: 'Font size', enumValues: ['sm', 'md', 'lg'], default: 'md' },
      muted: { type: 'boolean', description: 'Use muted color', default: false },
    },
    example: {
      type: 'RichText',
      props: { content: '# Hello\n\nParagraph with **bold** text.' },
    },
  },

  BannerCta: {
    name: 'BannerCta',
    module: 'shared',
    description: 'Compact promo/announcement strip with emoji, text, and CTA button.',
    compatibleWith: ['ecommerce', 'booking', 'infobiz'],
    props: {
      text: { type: 'string', description: 'Main promo text', required: true },
      subtext: { type: 'string', description: 'Secondary text' },
      emoji: { type: 'string', description: 'Leading emoji' },
      backgroundColor: { type: 'string', description: 'Background hex color' },
      textColor: { type: 'string', description: 'Text color', default: 'white' },
      ctaText: { type: 'string', description: 'Button label' },
      ctaPage: { type: 'string', description: 'Navigation target page ID' },
      variant: { type: 'enum', description: 'Banner style', enumValues: ['filled', 'gradient', 'subtle'], default: 'filled' },
    },
    example: {
      type: 'BannerCta',
      props: { emoji: '🎉', text: 'Free delivery on orders over $20', ctaText: 'Order now', ctaPage: 'catalog', variant: 'subtle' },
    },
  },

  // ─── ECOMMERCE ───────────────────────────────────────────────────────

  ProductList: {
    name: 'ProductList',
    module: 'ecommerce',
    description: 'Product grid with optional category filter chips and search. Click navigates to product-details.',
    compatibleWith: ['ecommerce'],
    props: {
      title: { type: 'string', description: 'Section title' },
      description: { type: 'string', description: 'Subtitle text' },
      columns: { type: 'enum', description: 'Grid columns', enumValues: ['1', '2', '3'], default: 2 },
      limit: { type: 'number', description: 'Max items to show' },
      showCategoryFilter: { type: 'boolean', description: 'Show category chip bar', default: true },
      showFavoritesOnly: { type: 'boolean', description: 'Filter to favorites only', default: false },
      enableFiltering: { type: 'boolean', description: 'Enable advanced filtering', default: false },
      emptyMessage: { type: 'string', description: 'Message when no products' },
      data: {
        type: 'array', description: 'Product items', required: true,
        items: {
          id: { type: 'string', description: 'Unique product ID', required: true },
          name: { type: 'string', description: 'Product name', required: true },
          price: { type: 'number', description: 'Price', required: true },
          image: { type: 'string', description: 'Image URL' },
          description: { type: 'string', description: 'Product description' },
          category: { type: 'string', description: 'Category name' },
          badge: { type: 'string', description: 'Badge text (e.g. "Popular")' },
          stockQuantity: { type: 'number', description: '-1=unlimited, 0=out of stock, >0=limited' },
        },
      },
    },
    example: {
      type: 'ProductList',
      props: { title: 'Popular', columns: 2, limit: 6, data: [{ id: 'p1', name: 'Item', price: 9.99, category: 'Cat' }], showCategoryFilter: true },
    },
  },

  CategoryGrid: {
    name: 'CategoryGrid',
    module: 'ecommerce',
    description: 'Clickable category cards. Tap stores selected category in sessionStorage and navigates to catalog.',
    compatibleWith: ['ecommerce'],
    props: {
      title: { type: 'string', description: 'Section title' },
      columns: { type: 'enum', description: 'Grid columns', enumValues: ['2', '3'], default: 2 },
      ctaPage: { type: 'string', description: 'Target page on tap', default: 'catalog' },
      items: {
        type: 'array', description: 'Category items', required: true,
        items: {
          id: { type: 'string', description: 'Category ID', required: true },
          name: { type: 'string', description: 'Display name', required: true },
          image: { type: 'string', description: 'Category photo URL' },
          icon: { type: 'string', description: 'Emoji fallback if no image' },
          count: { type: 'number', description: 'Product count in category' },
        },
      },
    },
    example: {
      type: 'CategoryGrid',
      props: { title: 'Categories', items: [{ id: 'pizza', name: 'Pizza', icon: '🍕', count: 8 }] },
    },
  },

  ProductDetails: {
    name: 'ProductDetails',
    module: 'ecommerce',
    description: 'Single product detail view. Reads selected product from Zustand store automatically.',
    compatibleWith: ['ecommerce'],
    props: {},
    example: { type: 'ProductDetails', props: {} },
  },

  Cart: {
    name: 'Cart',
    module: 'ecommerce',
    description: 'Shopping cart item list with quantity controls and remove buttons.',
    compatibleWith: ['ecommerce'],
    props: {
      showEmpty: { type: 'boolean', description: 'Show empty state', default: true },
      emptyMessage: { type: 'string', description: 'Empty cart message' },
    },
    example: { type: 'Cart', props: { showEmpty: true, emptyMessage: 'Your cart is empty' } },
  },

  CartSummary: {
    name: 'CartSummary',
    module: 'ecommerce',
    description: 'Order total, promo code input, and checkout button.',
    compatibleWith: ['ecommerce'],
    props: {
      showSubtotal: { type: 'boolean', description: 'Show subtotal line', default: true },
      showDiscount: { type: 'boolean', description: 'Show discount line', default: true },
      showTotal: { type: 'boolean', description: 'Show total line', default: true },
      promoCodeEnabled: { type: 'boolean', description: 'Enable promo code input', default: true },
      onCheckout: { type: 'string', description: 'Navigation string, e.g. "navigate:checkout"' },
    },
    example: { type: 'CartSummary', props: { promoCodeEnabled: true, onCheckout: 'navigate:checkout' } },
  },

  CheckoutForm: {
    name: 'CheckoutForm',
    module: 'ecommerce',
    description: 'Shipping address and contact form. Supports Telegram contact request for auto-fill.',
    compatibleWith: ['ecommerce'],
    props: {},
    example: { type: 'CheckoutForm', props: {} },
  },

  PaymentButton: {
    name: 'PaymentButton',
    module: 'ecommerce',
    description: 'Triggers Telegram invoice or Stars payment.',
    compatibleWith: ['ecommerce'],
    props: {
      text: { type: 'string', description: 'Button label', default: 'Pay Now' },
      variant: { type: 'enum', description: 'Payment type', enumValues: ['default', 'telegram', 'outline', 'stars'], default: 'telegram' },
      onPaymentSuccess: { type: 'string', description: 'Navigation on success, e.g. "navigate:order-success"' },
    },
    example: { type: 'PaymentButton', props: { text: 'Pay Now', variant: 'telegram', onPaymentSuccess: 'navigate:order-success' } },
  },

  OrderSuccess: {
    name: 'OrderSuccess',
    module: 'ecommerce',
    description: 'Order/booking confirmation screen with continue button.',
    compatibleWith: ['ecommerce', 'booking', 'infobiz'],
    props: {
      onContinue: { type: 'string', description: 'Navigation on continue, e.g. "navigate:home"' },
    },
    example: { type: 'OrderSuccess', props: { onContinue: 'navigate:home' } },
  },

  OrderFailed: {
    name: 'OrderFailed',
    module: 'ecommerce',
    description: 'Payment failure screen with retry option.',
    compatibleWith: ['ecommerce'],
    props: {
      error: { type: 'string', description: 'Error message to display' },
    },
    example: { type: 'OrderFailed', props: { error: 'Payment was declined' } },
  },

  OrdersList: {
    name: 'OrdersList',
    module: 'ecommerce',
    description: 'User order history list with status badges.',
    compatibleWith: ['ecommerce', 'infobiz'],
    props: {
      title: { type: 'string', description: 'Section title', default: 'My Orders' },
      description: { type: 'string', description: 'Subtitle' },
      showUserOrdersOnly: { type: 'boolean', description: 'Filter to current user', default: true },
      emptyMessage: { type: 'string', description: 'Empty state message' },
      onOrderClick: { type: 'string', description: 'Navigation on tap, e.g. "navigate:order-details"' },
    },
    example: { type: 'OrdersList', props: { title: 'My Orders', onOrderClick: 'navigate:order-details' } },
  },

  OrderDetails: {
    name: 'OrderDetails',
    module: 'ecommerce',
    description: 'Single order detail view with items, status, and cancel/reorder.',
    compatibleWith: ['ecommerce'],
    props: {},
    example: { type: 'OrderDetails', props: {} },
  },

  PromoSlider: {
    name: 'PromoSlider',
    module: 'ecommerce',
    description: 'Horizontal promotional banner carousel with auto-play.',
    compatibleWith: ['ecommerce'],
    props: {
      autoPlay: { type: 'boolean', description: 'Auto-advance slides', default: true },
      autoPlayInterval: { type: 'number', description: 'Interval in ms', default: 5000 },
      height: { type: 'string', description: 'Height: "sm", "md", "lg" or px number', default: 'md' },
      banners: {
        type: 'array', description: 'Slide items', required: true,
        items: {
          id: { type: 'string', description: 'Slide ID', required: true },
          title: { type: 'string', description: 'Slide title', required: true },
          description: { type: 'string', description: 'Slide description' },
          image: { type: 'string', description: 'Background image URL' },
          backgroundColor: { type: 'string', description: 'Fallback color' },
          ctaText: { type: 'string', description: 'Button text' },
          ctaPage: { type: 'string', description: 'Navigation target' },
        },
      },
    },
    example: {
      type: 'PromoSlider',
      props: { banners: [{ id: 'b1', title: 'Sale!', image: 'https://...', ctaPage: 'catalog' }] },
    },
  },

  SearchBar: {
    name: 'SearchBar',
    module: 'ecommerce',
    description: 'Product search input box. Works with ProductList filtering.',
    compatibleWith: ['ecommerce'],
    props: {
      placeholder: { type: 'string', description: 'Placeholder text', default: 'Search products...' },
    },
    example: { type: 'SearchBar', props: { placeholder: 'Search...' } },
  },

  FilterPanel: {
    name: 'FilterPanel',
    module: 'ecommerce',
    description: 'Advanced filter panel with category checkboxes and price range.',
    compatibleWith: ['ecommerce'],
    props: {},
    example: { type: 'FilterPanel', props: {} },
  },

  // ─── BOOKING ─────────────────────────────────────────────────────────

  ServiceList: {
    name: 'ServiceList',
    module: 'booking',
    description: 'Grid of bookable services with price, duration, and "Book" button.',
    compatibleWith: ['booking'],
    props: {
      title: { type: 'string', description: 'Section title' },
      description: { type: 'string', description: 'Subtitle' },
      columns: { type: 'enum', description: 'Grid columns', enumValues: ['1', '2', '3'], default: 2 },
      emptyMessage: { type: 'string', description: 'Empty state message' },
      data: {
        type: 'array', description: 'Service items', required: true,
        items: {
          id: { type: 'string', description: 'Service ID', required: true },
          name: { type: 'string', description: 'Service name', required: true },
          price: { type: 'number', description: 'Price', required: true },
          duration: { type: 'number', description: 'Duration in minutes' },
          description: { type: 'string', description: 'Service description' },
          category: { type: 'string', description: 'Category name' },
          image: { type: 'string', description: 'Image URL' },
          badge: { type: 'string', description: 'Badge text' },
        },
      },
    },
    example: {
      type: 'ServiceList',
      props: { title: 'Our Services', columns: 2, data: [{ id: 's1', name: 'Haircut', price: 35, duration: 45 }] },
    },
  },

  StaffList: {
    name: 'StaffList',
    module: 'booking',
    description: 'Team member cards with photo, bio, and "Book with" CTA.',
    compatibleWith: ['booking'],
    props: {
      title: { type: 'string', description: 'Section title' },
      subtitle: { type: 'string', description: 'Section subtitle' },
      layout: { type: 'enum', description: 'Layout style', enumValues: ['cards', 'compact'], default: 'cards' },
      items: {
        type: 'array', description: 'Staff members', required: true,
        items: {
          id: { type: 'string', description: 'Staff ID', required: true },
          name: { type: 'string', description: 'Full name', required: true },
          role: { type: 'string', description: 'Job title' },
          bio: { type: 'string', description: 'Bio text' },
          photo: { type: 'string', description: 'Photo URL' },
          ctaText: { type: 'string', description: 'Button label, e.g. "Book with Anna"' },
          ctaPage: { type: 'string', description: 'Navigation target' },
        },
      },
    },
    example: {
      type: 'StaffList',
      props: { title: 'Our team', items: [{ id: '1', name: 'Anna K.', role: 'Stylist', ctaText: 'Book with Anna', ctaPage: 'catalog' }] },
    },
  },

  WorkingHours: {
    name: 'WorkingHours',
    module: 'booking',
    description: 'Business hours table with address and phone. Auto-highlights today.',
    compatibleWith: ['booking'],
    props: {
      title: { type: 'string', description: 'Section title' },
      address: { type: 'string', description: 'Business address' },
      phone: { type: 'string', description: 'Phone number' },
      hours: {
        type: 'array', description: 'Working hours entries', required: true,
        items: {
          day: { type: 'string', description: 'Day(s), e.g. "Monday–Friday"', required: true },
          time: { type: 'string', description: 'Hours, e.g. "9:00–18:00" or "Closed"', required: true },
        },
      },
    },
    example: {
      type: 'WorkingHours',
      props: { title: 'Working hours', address: '123 Main St', hours: [{ day: 'Monday–Friday', time: '9:00–20:00' }] },
    },
  },

  BookingCheckoutForm: {
    name: 'BookingCheckoutForm',
    module: 'booking',
    description: 'Booking flow: date picker + time slots + contact form + confirmation. All-in-one.',
    compatibleWith: ['booking'],
    props: {},
    example: { type: 'BookingCheckoutForm', props: {} },
  },

  BookingSuccess: {
    name: 'BookingSuccess',
    module: 'booking',
    description: 'Booking confirmation screen with date, time, and service details.',
    compatibleWith: ['booking'],
    props: {},
    example: { type: 'BookingSuccess', props: {} },
  },

  BookingCalendar: {
    name: 'BookingCalendar',
    module: 'booking',
    description: 'Date picker calendar for appointment selection. Used inside BookingCheckoutForm.',
    compatibleWith: ['booking'],
    props: {},
    example: { type: 'BookingCalendar', props: {} },
  },

  TimeSlots: {
    name: 'TimeSlots',
    module: 'booking',
    description: 'Time slot picker with staff selection. Used inside BookingCheckoutForm.',
    compatibleWith: ['booking'],
    props: {},
    example: { type: 'TimeSlots', props: {} },
  },

  // ─── INFOBIZ ─────────────────────────────────────────────────────────

  InfoProductList: {
    name: 'InfoProductList',
    module: 'infobiz',
    description: 'Grid of info products (courses, PDFs, articles, consultations). Tap opens details.',
    compatibleWith: ['infobiz'],
    props: {
      title: { type: 'string', description: 'Section title' },
      data: {
        type: 'array', description: 'Info product items', required: true,
        items: {
          id: { type: 'string', description: 'Product ID', required: true },
          name: { type: 'string', description: 'Product name', required: true },
          slug: { type: 'string', description: 'URL-friendly slug' },
          type: { type: 'enum', description: 'Product type', enumValues: ['article', 'pdf', 'course', 'consultation'], required: true },
          price: { type: 'number', description: 'Price (0 = free)', required: true },
          description: { type: 'string', description: 'Short description' },
          image: { type: 'string', description: 'Cover image URL' },
          content: { type: 'string', description: 'Full content (markdown)' },
          fileId: { type: 'string', description: 'Directus file UUID for PDF' },
          externalUrl: { type: 'string', description: 'External link URL' },
        },
      },
    },
    example: {
      type: 'InfoProductList',
      props: { title: 'Popular', data: [{ id: 'ip1', name: 'TMA Guide', type: 'pdf', price: 29 }] },
    },
  },

  InfoProductDetails: {
    name: 'InfoProductDetails',
    module: 'infobiz',
    description: 'Full product detail with content preview and buy button. Reads from sessionStorage.',
    compatibleWith: ['infobiz'],
    props: {},
    example: { type: 'InfoProductDetails', props: {} },
  },

  LeadCaptureForm: {
    name: 'LeadCaptureForm',
    module: 'infobiz',
    description: 'Contact/lead form (name, email, phone). Sends to /api/leads.',
    compatibleWith: ['infobiz', 'booking'],
    props: {
      title: { type: 'string', description: 'Form title' },
      description: { type: 'string', description: 'Subtitle text' },
      source: { type: 'string', description: 'Lead source tag', default: 'lead-form' },
      onSuccess: { type: 'string', description: 'Navigation on submit, e.g. "navigate:home"' },
    },
    example: {
      type: 'LeadCaptureForm',
      props: { title: 'Get in touch', description: "We'll reply within 24h", onSuccess: 'navigate:home' },
    },
  },

  InfobizCheckout: {
    name: 'InfobizCheckout',
    module: 'infobiz',
    description: 'Telegram Stars payment for info products. Reads product from sessionStorage.',
    compatibleWith: ['infobiz'],
    props: {
      onSuccess: { type: 'string', description: 'Navigation on success', default: 'navigate:order-success' },
    },
    example: { type: 'InfobizCheckout', props: { onSuccess: 'navigate:order-success' } },
  },

  AuthorBio: {
    name: 'AuthorBio',
    module: 'infobiz',
    description: 'Expert/author card with photo, bio, credentials, and CTA button.',
    compatibleWith: ['infobiz'],
    props: {
      name: { type: 'string', description: 'Author name', required: true },
      title: { type: 'string', description: 'Expert title/role' },
      bio: { type: 'string', description: 'Biography text' },
      photo: { type: 'string', description: 'Photo URL' },
      credentials: { type: 'array', description: 'Credential strings, e.g. ["500+ students", "4.9★"]' },
      ctaText: { type: 'string', description: 'Button label' },
      ctaPage: { type: 'string', description: 'Navigation target' },
    },
    example: {
      type: 'AuthorBio',
      props: { name: 'Alex Johnson', title: 'Marketing expert', bio: '10+ years...', credentials: ['500+ students'], ctaText: 'Book a call', ctaPage: 'lead-form' },
    },
  },

  StatsRow: {
    name: 'StatsRow',
    module: 'infobiz',
    description: 'Social proof numbers row (students, courses, rating).',
    compatibleWith: ['infobiz'],
    props: {
      layout: { type: 'enum', description: 'Layout style', enumValues: ['row', 'grid'], default: 'row' },
      items: {
        type: 'array', description: 'Stat items', required: true,
        items: {
          icon: { type: 'string', description: 'Emoji' },
          value: { type: 'string', description: 'Number/text, e.g. "1,000+"', required: true },
          label: { type: 'string', description: 'Label text, e.g. "Students"', required: true },
        },
      },
    },
    example: {
      type: 'StatsRow',
      props: { items: [{ icon: '👨‍🎓', value: '1,000+', label: 'Students' }] },
    },
  },

  FaqAccordion: {
    name: 'FaqAccordion',
    module: 'infobiz',
    description: 'Expandable FAQ section. One item open at a time.',
    compatibleWith: ['infobiz', 'ecommerce', 'booking'],
    props: {
      title: { type: 'string', description: 'Section title' },
      items: {
        type: 'array', description: 'FAQ entries', required: true,
        items: {
          question: { type: 'string', description: 'Question text', required: true },
          answer: { type: 'string', description: 'Answer text', required: true },
        },
      },
    },
    example: {
      type: 'FaqAccordion',
      props: { title: 'FAQ', items: [{ question: 'Refund policy?', answer: '7-day no-questions refund.' }] },
    },
  },
};

/** Total number of components in the manifest */
export const MANIFEST_COMPONENT_COUNT = Object.keys(COMPONENT_MANIFEST).length;

/** Get components compatible with a given business type */
export function getComponentsForType(appType: 'ecommerce' | 'booking' | 'infobiz'): ComponentManifestEntry[] {
  return Object.values(COMPONENT_MANIFEST).filter(c => c.compatibleWith.includes(appType));
}
