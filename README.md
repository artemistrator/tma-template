# TMA Template - Telegram Mini App Template

A production-ready template for building Telegram Mini Apps (TMA) with dynamic configuration-driven rendering.

## 🚀 Features

- **Dynamic Page Rendering** - Pages and components defined in JSON/TypeScript config
- **15+ E-commerce Components** - Product cards, cart, checkout, payments, order tracking
- **Telegram Integration** - Native WebApp API, theme, MainButton, BackButton, contact requests
- **Type-Safe DSL** - Zod-validated schema for app configuration
- **State Management** - Zustand-based cart, orders, and session storage
- **Responsive Design** - Tailwind CSS + shadcn/ui components
- **Telegram Notifications** - Order notifications to admin via Telegram bot
- **Navigation System** - Hash-based routing with product/order details pages
- **Docker Ready** - Multi-stage build for production deployment
- **Test Coverage** - Jest + React Testing Library

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| State | Zustand 5 |
| Validation | Zod 4 |
| Testing | Jest 30 + React Testing Library |
| Deployment | Vercel / Docker / Docker Compose |
| Database | Directus (planned) / Supabase (planned) |
| Telegram | @types/telegram-web-app 9.1 |

## 🏁 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Telegram account (for testing in Telegram WebApp)

### Installation

```bash
# Clone the template
git clone https://github.com/artemistrator/tma-template.git tma-app
cd tma-app

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local and add your Telegram bot credentials
# TELEGRAM_ADMIN_ID=your_user_id
# TELEGRAM_BOT_TOKEN=your_bot_token

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser or test in Telegram WebApp.

### Testing in Telegram

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Use `/newapp` to create a Mini App
3. Set the URL to `http://localhost:3000` (use ngrok for remote access)
4. Open the app in Telegram

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run production only
docker-compose up tma-app

# Run development mode with hot reload
docker-compose up tma-dev
```

## 📐 Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (orders, notifications, products)
│   ├── layout.tsx         # Root layout with TelegramProvider
│   └── page.tsx           # Main page with dynamic rendering
├── components/
│   ├── core/              # Base components (Screen, Header, Modal, BottomNav)
│   ├── ecommerce/         # E-commerce components (15+)
│   ├── ui/                # shadcn/ui primitives
│   └── index.ts           # Component registry initialization
├── config/
│   ├── demo.ts            # Demo app configuration (TypeScript)
│   ├── demo.json          # Demo app configuration (JSON)
│   ├── mini-app-schema.json # JSON Schema for validation
│   └── seed-data.ts       # Mock data for development
├── lib/
│   ├── renderer/          # Dynamic page and component rendering
│   │   ├── page-renderer.tsx
│   │   └── component-registry.tsx
│   ├── schema/            # Zod schemas for validation
│   │   └── mini-app-schema.ts
│   ├── telegram/          # Telegram WebApp integration
│   │   ├── use-telegram.ts
│   │   ├── telegram-provider.tsx
│   │   └── use-telegram-user.ts
│   └── utils.ts           # Utility functions (cn, etc.)
└── store/
    ├── cart-store.ts      # Shopping cart, orders, favorites state
    └── product-store.ts   # Product filtering and search state
```

### Component Registry

Components are registered in `src/components/index.ts` and rendered dynamically via `PageRenderer`.

**Available Components:**

**Core:**
- `Screen` - Layout wrapper
- `Header` - Navigation header
- `Modal` - Dialog modal
- `BottomNav` - Bottom navigation bar

**E-commerce:**
- `ProductCard` - Single product display with image, price, add to cart
- `ProductList` - Product grid with filtering support
- `ProductDetails` - Detailed product view
- `PromoSlider` - Promotional carousel
- `Cart` - Shopping cart items list
- `CartSummary` - Order totals, promo codes
- `CheckoutForm` - Shipping address form with Telegram contact request
- `PaymentButton` - Telegram payment integration
- `OrdersList` - Order history with status
- `OrderDetails` - Detailed order view
- `OrderSuccess` - Order confirmation page
- `OrderFailed` - Order failure page
- `SearchBar` - Product search
- `FilterPanel` - Category and price filters

## 🔧 DSL Schema

The app is configured via TypeScript/JSON schema. Here's a minimal example:

```typescript
// src/config/demo.ts
import type { MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

export const demoConfig: MiniAppSchemaType = {
  meta: {
    title: "My Shop",
    locale: "en",
    currency: "USD",
  },
  pages: [
    {
      id: "home",
      title: "Home",
      route: "/",
      components: [
        {
          type: "ProductList",
          props: { 
            title: "Featured", 
            columns: 2,
            data: [...] // Product data
          },
        }
      ]
    },
    {
      id: "catalog",
      title: "Catalog",
      route: "/catalog",
      components: [...]
    },
    {
      id: "cart",
      title: "Cart",
      route: "/cart",
      components: [...]
    },
    {
      id: "product-details",
      title: "Product Details",
      route: "/product-details",
      components: [...]
    },
    {
      id: "orders",
      title: "My Orders",
      route: "/orders",
      components: [...]
    }
  ],
};
```

### Schema Reference

| Section | Description |
|---------|-------------|
| `meta` | App metadata (title, logo, locale, currency, theme) |
| `dataModel` | Entity definitions (optional, for documentation) |
| `pages` | Array of page configurations with components |
| `flows` | User journey definitions (optional) |

### Navigation

Navigation uses hash-based routing:
- `window.location.hash = 'pageId'` - Navigate to page
- `window.location.hash = 'product-details?productId=123'` - Product details
- `window.location.hash = 'order-details?orderId=ORD-123'` - Order details

Component navigation via `onNavigate` prop:
```json
{
  "type": "OrdersList",
  "props": {
    "onOrderClick": "navigate:order-details"
  }
}
```

### Component Types

**Core:**
- `Screen` - Layout wrapper
- `Header` - Navigation header
- `Modal` - Dialog modal

**E-commerce:**
- `ProductCard` - Single product display
- `ProductList` - Product grid
- `PromoSlider` - Promotional carousel
- `Cart` - Shopping cart items
- `CartSummary` - Order totals
- `CheckoutForm` - Shipping address form
- `PaymentButton` - Payment processing

## 🎨 Component Props

### ProductList

```json
{
  "type": "ProductList",
  "props": {
    "title": "Featured Products",
    "description": "Our best sellers",
    "columns": 2,
    "limit": 6
  },
  "binding": {
    "source": "products"
  }
}
```

### Cart

```json
{
  "type": "Cart",
  "props": {
    "showEmpty": true,
    "emptyMessage": "Your cart is empty"
  }
}
```

### PaymentButton

```json
{
  "type": "PaymentButton",
  "props": {
    "text": "Pay Now",
    "variant": "telegram"
  },
  "events": {
    "onPaymentSuccess": "navigate:order-confirmation"
  }
}
```

## 🤖 Orchestrator Guide

For orchestrator developers: the template is designed to be cloned and configured via TypeScript/JSON.

### Generating an App

1. **Clone template**
   ```bash
   git clone https://github.com/artemistrator/tma-template.git <new-app-dir>
   cd <new-app-dir>
   ```

2. **Generate config** based on user requirements:
   - Select components from library
   - Configure props and data
   - Define pages and navigation

3. **Write config** to `src/config/demo.ts` (TypeScript) or `src/config/demo.json` (JSON)

4. **Customize** as needed:
   - Update `meta` section (title, currency, theme)
   - Configure pages and components
   - Add product data

5. **Deploy** to Vercel or your hosting

### Config Generation Example

```typescript
// Orchestrator pseudo-code
function generateConfig(requirements: AppRequirements) {
  const config: MiniAppSchemaType = {
    meta: {
      title: requirements.shopName,
      locale: requirements.locale || 'en',
      currency: requirements.currency || 'USD',
      theme: {
        primaryColor: requirements.brandColor || '#007AFF',
      },
    },
    pages: [
      {
        id: 'home',
        title: 'Home',
        route: '/',
        components: requirements.homeComponents.map(comp => ({
          type: comp.type,
          props: comp.props,
        })),
      },
      // Add more pages...
    ],
  };
  return config;
}
```

### Module-Based Architecture (Future)

The template is designed to evolve into a module-based architecture:

```
src/
├── core/              # Core library (Telegram, UI, utils)
├── modules/           # Business modules
│   ├── products/      # Product catalog, details
│   ├── cart/          # Shopping cart
│   ├── orders/        # Order management
│   └── admin/         # Admin panel
└── apps/
    ├── client/        # Client-facing TMA
    └── admin/         # Admin TMA (optional)
```

See `TELEGRAM_SETUP.md` for Telegram integration details.

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - TELEGRAM_ADMIN_ID
# - TELEGRAM_BOT_TOKEN
```

### Docker

```bash
# Build
docker build -t tma-app .

# Run
docker run -p 3000:3000 tma-app
```

### Docker Compose

```bash
# Production
docker-compose up tma-app

# Development (with hot reload)
docker-compose up tma-dev
```

### Other Hosts

The template includes a standalone Dockerfile compatible with:
- Render
- Railway
- Fly.io
- Any Docker host

## 📱 Telegram Integration

### Setup

1. **Create a bot**: Message [@BotFather](https://t.me/botfather) and send `/newbot`
2. **Get bot token**: BotFather will provide a token
3. **Get your user ID**: Message [@userinfobot](https://t.me/userinfobot) to get your ID
4. **Configure environment**: Add to `.env.local`:
   ```bash
   TELEGRAM_ADMIN_ID=your_user_id
   TELEGRAM_BOT_TOKEN=your_bot_token
   ```

### Features

- **Theme Integration** - App uses Telegram's theme colors
- **MainButton** - Native Telegram action button
- **BackButton** - Native back navigation
- **Haptic Feedback** - Tactile responses
- **Contact Requests** - Request user phone via Telegram
- **Order Notifications** - Send orders to admin's Telegram

See `TELEGRAM_SETUP.md` for detailed setup guide.

### Testing in Telegram

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Use `/newapp` to create a Mini App
3. Set the URL to your deployed app
4. Open the app in Telegram

### Local Development with Telegram

Use [ngrok](https://ngrok.com) to expose localhost:

```bash
ngrok http 3000
```

Set the ngrok URL as your Mini App URL in BotFather.

## 📄 License

MIT

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Zod](https://zod.dev)
- [Telegram WebApp API](https://core.telegram.org/bots/webapps)
