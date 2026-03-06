# TMA Template - Telegram Mini App Template

A production-ready template for building Telegram Mini Apps (TMA) with dynamic configuration-driven rendering.

## 🚀 Features

- **Dynamic Page Rendering** - Pages and components defined in JSON schema
- **10+ E-commerce Components** - Product cards, cart, checkout, payments
- **Telegram Integration** - Native WebApp API, theme, MainButton, BackButton
- **Type-Safe DSL** - Zod-validated schema for app configuration
- **State Management** - Zustand-based cart and session storage
- **Responsive Design** - Tailwind CSS + shadcn/ui
- **Docker Ready** - Multi-stage build for production deployment
- **Test Coverage** - Jest + React Testing Library

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Validation | Zod |
| Testing | Jest + React Testing Library |
| Deployment | Vercel / Docker |

## 🏁 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the template
git clone <your-orchestrator-repo> tma-app
cd tma-app

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser or Telegram WebApp.

### Docker

```bash
# Build and run with Docker
docker-compose up --build

# Production only
docker-compose up tma-app
```

## 📐 Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout with TelegramProvider
│   └── page.tsx           # Main page with dynamic rendering
├── components/
│   ├── core/              # Base components (Screen, Header, Modal)
│   ├── ecommerce/         # E-commerce components
│   └── index.ts           # Component registry initialization
├── config/
│   ├── demo.json          # Demo app configuration
│   └── seed-data.ts       # Mock data for development
├── lib/
│   ├── renderer/          # Dynamic page and component rendering
│   ├── schema/            # Zod schemas for validation
│   └── telegram/          # Telegram WebApp integration
└── store/
    └── cart-store.ts      # Shopping cart state
```

## 🔧 DSL Schema

The app is configured via JSON schema. Here's a minimal example:

```json
{
  "meta": {
    "title": "My Shop",
    "locale": "en",
    "currency": "USD"
  },
  "pages": [
    {
      "id": "home",
      "title": "Home",
      "route": "/",
      "components": [
        {
          "type": "ProductList",
          "props": { "title": "Featured", "columns": 2 },
          "binding": { "source": "products" }
        }
      ]
    }
  ],
  "apiEndpoints": {
    "products": { "url": "/api/products", "method": "GET" }
  }
}
```

### Schema Reference

| Section | Description |
|---------|-------------|
| `meta` | App metadata (title, logo, locale, currency) |
| `dataModel` | Entity definitions (optional, for documentation) |
| `pages` | Array of page configurations |
| `flows` | User journey definitions (optional) |
| `apiEndpoints` | API endpoint mappings for data bindings |

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

For orchestrator developers: the template is designed to be cloned and configured via JSON.

### Generating an App

1. **Clone template**
   ```bash
   git clone <template-repo> <new-app-dir>
   ```

2. **Generate config** based on user requirements:
   - Select components from library
   - Configure props and bindings
   - Define pages and flows

3. **Write config** to `src/config/app.json`

4. **Update** `src/app/page.tsx` to load your config:
   ```typescript
   import appConfig from '@/config/app.json';
   ```

5. **Deploy** to Vercel or your hosting

### Config Generation Example

```typescript
// Orchestrator pseudo-code
function generateConfig(requirements: AppRequirements) {
  return {
    meta: {
      title: requirements.shopName,
      locale: requirements.locale || 'en',
      currency: requirements.currency || 'USD',
    },
    pages: requirements.pages.map(page => ({
      id: page.id,
      title: page.title,
      route: page.route,
      components: page.components.map(comp => ({
        type: comp.type,
        props: comp.props,
        binding: comp.binding,
      })),
    })),
  };
}
```

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
```

### Docker

```bash
# Build
docker build -t tma-app .

# Run
docker run -p 3000:3000 tma-app
```

### Other Hosts

The template includes a standalone Dockerfile compatible with:
- Render
- Railway
- Fly.io
- Any Docker host

## 📱 Telegram Integration

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
