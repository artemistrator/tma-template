# Implementation Plan — 15.03.2026

## PHASE 1 — Images (Single Image per Card)

### Status: TODO

Directus stores uploaded files as UUIDs. The full asset URL is:
`http://tma-directus:8055/assets/{file_uuid}`

Components (`ProductCard`, `ServiceList`) already accept `image` prop and render `<Image>`.
The missing parts are: URL conversion, `Service` type missing `image`, Next.js image domains.

---

### Task 1.1 — `next.config.mjs`: Add Directus hostnames to remotePatterns

**File:** `next.config.mjs`

Add two patterns to `images.remotePatterns`:
- `{ protocol: 'http', hostname: 'tma-directus', port: '8055', pathname: '/assets/**' }`
- `{ protocol: 'http', hostname: 'localhost', port: '8055', pathname: '/assets/**' }`

This allows Next.js `<Image>` to load files from Directus.

---

### Task 1.2 — `src/lib/directus.ts`: Add `image` to `Service` interface

**File:** `src/lib/directus.ts`

Add `image?: string | null;` to the `Service` interface (line ~88).
Also add a helper constant `DIRECTUS_ASSETS_URL` = `${DIRECTUS_URL}/assets`.

---

### Task 1.3 — `src/app/api/config/route.ts`: Convert image UUID → full URL

**File:** `src/app/api/config/route.ts`

In `buildConfigFromDirectus`:
- For products: `image: p.image ? \`${DIRECTUS_URL}/assets/${p.image}\` : undefined`
- For services: Add `image: s.image ? \`${DIRECTUS_URL}/assets/${s.image}\` : undefined` (currently missing from services mapping)

Import `DIRECTUS_URL` from `@/lib/directus`.

Also update the `services` parameter type to include `image?: string | null`.

---

### Task 1.4 — `src/modules/booking/components/ServiceList.tsx`: Verify image rendering

**File:** `src/modules/booking/components/ServiceList.tsx`

Confirm `image` is passed from `data` items to each service card's `<Image>` or `<img>`.
If image is rendered but Next.js Image is used — make sure `fill` or explicit dimensions are set.
Add a placeholder div when `image` is null (same pattern as `ProductCard`).

---

## PHASE 2 — Booking Improvements

### Task 2.1 — Working Hours: Directus Collection + API

**Directus:** Create collection `working_hours` with fields:
- `id` (auto)
- `tenant_id` (string, FK to tenants.slug)
- `day_of_week` (integer: 0=Sun, 1=Mon, ..., 6=Sat)
- `start_time` (string, e.g. "09:00")
- `end_time` (string, e.g. "18:00")
- `is_day_off` (boolean, default false)

**File:** `src/lib/directus.ts`

Add interface `WorkingHours` and function `getWorkingHoursByTenant(tenantId: string)`.

**File:** `src/app/api/bookings/check-availability/route.ts`

Instead of hardcoded `generateTimeSlots('09:00', '18:00', duration)`:
1. Fetch `working_hours` for the given `tenantId` and `day_of_week` (from `date` param)
2. If no record found or `is_day_off === true` → return `{ availableSlots: [], isDayOff: true }`
3. Use fetched `start_time` / `end_time` for slot generation

**File:** `src/modules/booking/components/TimeSlots.tsx`

Handle new `isDayOff` response field: show "Closed on this day" message.

**File:** `src/modules/booking/components/BookingCalendar.tsx`

Optionally mark day-off days as disabled. Requires fetching `working_hours` on calendar mount.

---

### Task 2.2 — Staff/Masters

**Directus:** Create collection `staff` with fields:
- `id` (auto)
- `tenant_id` (string)
- `name` (string)
- `image` (image, FK to directus_files)
- `bio` (text, optional)
- `status` (string: active/inactive)

**Directus:** Add field `staff_id` (integer, FK to staff) to `services` collection.

**File:** `src/lib/directus.ts`

Add `Staff` interface, `getStaffByTenant(tenantId)` function.

**File:** `src/app/api/config/route.ts`

Fetch staff list alongside services (call `getStaffByTenant`).
Pass `staffId` in each service item's props.
Add a `StaffList` page to the booking config (optional — depends on UX preference).

**File:** `src/modules/booking/components/ServiceList.tsx`

Show master name/avatar on each service card if `staffId` is set.

**File:** `src/app/api/bookings/check-availability/route.ts`

Filter bookings by `staff_id` (if service has assigned staff), not just by `tenant_id`.
This way each master has independent availability.

**File:** `src/app/api/bookings/route.ts`

When creating booking, resolve `staff_id` from service and store in `bookings.staff_id`.

---

### Task 2.3 — Blocked Dates

**Directus:** Create collection `blocked_dates` with fields:
- `id` (auto)
- `tenant_id` (string)
- `date` (date, YYYY-MM-DD)
- `reason` (string, optional — e.g. "Holiday", "Vacation")

**File:** `src/app/api/bookings/check-availability/route.ts`

Before generating slots, check `blocked_dates` for the requested `date` and `tenantId`.
If found → return `{ availableSlots: [], isDayOff: true, reason: "..." }`.

**File:** `src/modules/booking/components/BookingCalendar.tsx`

Fetch blocked dates for the tenant on mount and disable them in the calendar UI.
New API endpoint: `GET /api/bookings/blocked-dates?tenantId=barber` returns array of date strings.

**New file:** `src/app/api/bookings/blocked-dates/route.ts`

Returns blocked dates for a given tenant from `blocked_dates` collection (admin auth).

---

### Task 2.4 — Booking Cancellation

**Directus:** Ensure `bookings` collection has `status` field with values: `pending`, `confirmed`, `cancelled`.

**New file:** `src/app/api/bookings/[id]/route.ts`

```
PATCH /api/bookings/{id}
Body: { status: 'cancelled', tenantId: 'barber' }
```

Updates booking status in Directus. Must verify `tenant_id` matches to prevent unauthorized cancellation.
Sends Telegram notification to admin on cancellation.

**File:** `src/modules/ecommerce/components/order-details.tsx`

For booking orders (`foundOrder.bookingDate`), show "Cancel Booking" button if status is `pending` or `confirmed`.
On click: calls `PATCH /api/bookings/{id}` and updates local order status in store.

**File:** `src/store/cart-store.ts`

Add `updateOrderStatus(orderId: string, status: string)` action to update order in local state.

---

### Task 2.5 — Booking Reminders (Telegram)

**New file:** `src/app/api/bookings/send-reminders/route.ts`

```
POST /api/bookings/send-reminders
```

This endpoint:
1. Fetches all bookings from Directus where `date` is tomorrow (next 24h window) and `status` = confirmed/pending
2. For each booking, sends Telegram message to `TELEGRAM_ADMIN_ID` with reminder details
3. Should be called daily via a cron job (external — e.g. cron-job.org, GitHub Actions, or Vercel Cron)

**Note:** Client Telegram ID is not collected in the current flow — reminders go to admin only.
To remind customers, we'd need to collect their Telegram user ID at booking time (future task).

**Vercel Cron (if deployed on Vercel):** Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/bookings/send-reminders", "schedule": "0 8 * * *" }]
}
```

---

## PHASE 3 — Ecommerce Improvements

### Task 3.1 — Product Categories

**Directus:** Create collection `product_categories` with fields:
- `id` (auto)
- `tenant_id` (string)
- `name` (string)
- `slug` (string, unique per tenant)
- `image` (image, optional)
- `sort` (integer)

**Directus:** Change `products.category` from string to FK → `product_categories.id` (or keep as string slug for simplicity — recommended: keep as string for now).

**File:** `src/lib/directus.ts`

Add `ProductCategory` interface and `getCategoriesByTenant(tenantId)` function.

**File:** `src/app/api/config/route.ts`

Fetch categories, pass them as `categories` prop to `ProductList` component.

**File:** `src/modules/ecommerce/components/product-list.tsx`

Add horizontal scrollable category filter bar at top.
On category select → filter displayed products by `category` field.
"All" chip is always first and shows all products.

**File:** `src/modules/ecommerce/components/filter-panel.tsx`

Update to use real category data from props instead of hardcoded values (if currently hardcoded).

---

### Task 3.2 — Product Variants (Size/Color)

**Directus:** Create collection `product_variants` with fields:
- `id` (auto)
- `product_id` (FK to products)
- `tenant_id` (string)
- `name` (string, e.g. "Large", "Red")
- `type` (string: "size" | "color" | "custom")
- `price_modifier` (number, default 0 — added to base price)
- `sku` (string, optional)
- `stock_quantity` (integer, default -1 means unlimited)

**File:** `src/lib/directus.ts`

Add `ProductVariant` interface and `getVariantsByProduct(productId)`.

**File:** `src/modules/ecommerce/components/product-details.tsx`

Fetch and display variants on product detail page.
User selects variant → price updates to `base_price + variant.price_modifier`.
Selected variant stored in cart item.

**File:** `src/store/cart-store.ts`

Add `variantId?: string` and `variantName?: string` to `CartItem` interface.

**File:** `src/modules/ecommerce/components/cart.tsx`

Show selected variant name next to cart item.

---

### Task 3.3 — Stock Quantity

**Directus:** Add `stock_quantity` field (integer, default -1) to `products` collection.
- `-1` means unlimited
- `0` means out of stock
- `> 0` means limited stock

**File:** `src/lib/directus.ts`

Add `stock_quantity?: number` to `Product` interface.

**File:** `src/app/api/config/route.ts`

Pass `stockQuantity` in each product item.
Filter out products where `stock_quantity === 0` OR show them as "Out of Stock".

**File:** `src/modules/ecommerce/components/product-card.tsx`

Show "Out of Stock" badge and disable "Add to Cart" button when `stockQuantity === 0`.

**File:** `src/app/api/orders/route.ts`

After order is created, decrement `stock_quantity` for each ordered product in Directus.
Use `updateItem('products', id, { stock_quantity: current - quantity })`.

---

### Task 3.4 — Promo Codes

**Directus:** Create collection `promo_codes` with fields:
- `id` (auto)
- `tenant_id` (string)
- `code` (string, unique per tenant, uppercase)
- `discount_type` (string: "percent" | "fixed")
- `discount_value` (number)
- `min_order_amount` (number, default 0)
- `max_uses` (integer, default -1 for unlimited)
- `used_count` (integer, default 0)
- `expires_at` (datetime, optional)
- `status` (string: active/inactive)

**New file:** `src/app/api/promo/validate/route.ts`

```
POST /api/promo/validate
Body: { code: string, tenantId: string, orderTotal: number }
```

Returns: `{ valid: true, discountType, discountValue, discountAmount }` or `{ valid: false, error }`.

**File:** `src/modules/ecommerce/components/cart-summary.tsx`

Implement promo code input UI (currently may have placeholder).
On "Apply" click → calls `/api/promo/validate`.
On success → saves discount to cart store and shows discount line.

**File:** `src/store/cart-store.ts`

Add `promoCode?: string`, `discountAmount?: number` to store state.
Add `applyPromo(code, discountAmount)` and `removePromo()` actions.

**File:** `src/app/api/orders/route.ts`

Accept `promoCode` and `discountAmount` in order creation.
After creating order, increment `used_count` on the promo code in Directus.
Store `promo_code` and `discount_amount` in the `orders` record.

---

### Task 3.5 — Order Status Updates + Telegram Notifications

**File:** `src/app/api/orders/[id]/route.ts` (new or existing)

```
PATCH /api/orders/{id}
Body: { status: string, tenantId: string }
```

Updates order status in Directus. Sends Telegram notification to admin and optionally to customer.

**Telegram webhook / Directus Flow (alternative approach):**
In Directus admin, create a **Flow** triggered on `orders` update:
- Trigger: "Item Updated", collection `orders`, condition: status changed
- Action: HTTP Request to `POST /api/send-order-notification` with order data

This way status updates from the Directus dashboard automatically notify customers.

**File:** `src/app/api/send-order-notification/route.ts` (already exists — review and update)

Ensure it handles both ecommerce order status changes and sends proper messages.

---

## PHASE 4 — Infobiz Template

### Task 4.1 — Directus Collections

Create the following collections:

**`info_products`**
- `id`, `tenant_id`, `name`, `slug`
- `type` (string: "article" | "pdf" | "course" | "consultation")
- `description` (text)
- `content` (rich text — for articles)
- `price` (number)
- `image` (image)
- `file_id` (FK to directus_files — for PDFs)
- `external_url` (string — for external course links)
- `status` (published/draft)

**`leads`**
- `id`, `tenant_id`
- `name`, `email`, `phone`
- `source` (string — which page/button triggered it)
- `created_at`
- `notes`

**`info_orders`** (or reuse `orders` with type field)
- Reuse existing `orders` collection, add `type` field: "ecommerce" | "infobiz"
- Add `product_id` FK to `info_products`
- Add `access_granted` (boolean) — true after payment confirmed

---

### Task 4.2 — Infobiz Pages Config

**File:** `src/app/api/config/route.ts`

Add `isInfobiz = tenant.config?.businessType === 'infobiz'` branch.

Pages for infobiz tenant:
- `home` — Hero block + featured products grid
- `catalog` — `InfoProductList` component
- `product-details` — `InfoProductDetails` component
- `lead-form` — `LeadCaptureForm` component
- `checkout` — `InfobizCheckout` component
- `order-success` — `OrderSuccess` (reuse existing)

---

### Task 4.3 — New Components

**New file:** `src/modules/infobiz/components/InfoProductList.tsx`

Displays grid of info products. Similar to `ProductList` but:
- Shows product `type` badge (Article, PDF, Course, Consultation)
- "Free" badge if `price === 0`
- Click → navigates to `info-product-details`

**New file:** `src/modules/infobiz/components/InfoProductDetails.tsx`

Full product page:
- Image, name, description, price
- For `article` type: renders content inline
- For `pdf`/`course` type: "Buy to access" with checkout button
- For `consultation` type: links to booking or lead form

**New file:** `src/modules/infobiz/components/LeadCaptureForm.tsx`

Simple form: Name + Email + Phone (optional) + Submit.
On submit: `POST /api/leads` → saves to Directus `leads` collection.
Sends Telegram notification to admin.

**New file:** `src/modules/infobiz/components/InfobizCheckout.tsx`

For paid products:
- Shows product summary
- Name + Email fields
- "Pay with Telegram Stars" button (Task 4.4) or regular payment

---

### Task 4.4 — Telegram Stars Payment

Telegram Stars is Telegram's built-in payment system for digital goods.

**How it works:**
1. Bot sends invoice with `sendInvoice` (currency: `XTR`, prices in stars)
2. User pays in Telegram
3. Bot receives `pre_checkout_query` → must answer within 10s
4. Bot receives `successful_payment` update → deliver content

**New file:** `src/app/api/telegram/webhook/route.ts`

Telegram bot webhook handler:
- `POST /api/telegram/webhook`
- Handles `pre_checkout_query`: validate order, answer with `answerPreCheckoutQuery`
- Handles `successful_payment`: mark order as paid in Directus, send access link

**New file:** `src/app/api/create-stars-invoice/route.ts`

```
POST /api/create-stars-invoice
Body: { productId, tenantId, userId (Telegram), chatId }
```

Calls `sendInvoice` with `currency: 'XTR'`, returns invoice link.

**Setup required:**
- Bot must have payments enabled (via @BotFather → `/mybots` → Payments → Telegram Stars)
- Set webhook: `POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={APP_URL}/api/telegram/webhook`

---

### Task 4.5 — Digital Delivery

**File:** `src/app/api/telegram/webhook/route.ts` (in `successful_payment` handler)

After payment confirmed:
1. Mark `info_orders.access_granted = true` in Directus
2. Fetch `info_products.file_id` or `external_url`
3. Send user a message with download link: `${DIRECTUS_URL}/assets/${file_id}?access_token=...`
   - Or use Directus signed URL with short expiry
4. For courses: send `external_url` directly

---

## PHASE 5 — Platform / Theming

### Task 5.1 — Tenant Theme via CSS Variables

**File:** `src/app/layout.tsx` or root provider

Read `config.meta.theme.primaryColor` and `secondaryColor`.
Inject as inline CSS variables on `<html>` or `<body>`:
```html
<html style="--primary: #007AFF; --secondary: #5856D6;">
```

Components already use Tailwind's `bg-primary` etc. which map to CSS vars in `globals.css`.
Only need to update the variable injection point.

---

### Task 5.2 — Locale / i18n

**File:** `src/app/api/config/route.ts`

Expose `config.meta.locale` (already done — `tenant.config?.locale || 'en'`).

**File:** `src/context/app-config-context.tsx`

Add a `t(key)` translation helper that reads from a locale dictionary based on `config.meta.locale`.

Create `src/lib/i18n/en.ts` and `src/lib/i18n/ru.ts` with UI strings.

---

## Implementation Order (Recommended)

```
Phase 1 (Images)          → Quick win, visible result, ~1-2h
Phase 2.1 (Working hours) → Important for booking correctness
Phase 2.3 (Blocked dates) → Needed before going live
Phase 3.1 (Categories)    → Improves catalog UX
Phase 3.3 (Stock)         → Prevents overselling
Phase 3.4 (Promo codes)   → Marketing tool
Phase 2.2 (Staff)         → Only if multi-master needed
Phase 2.4 (Cancellation)  → Polish
Phase 2.5 (Reminders)     → Needs Vercel Cron or external cron
Phase 3.2 (Variants)      → Complex, only if needed
Phase 3.5 (Order status)  → Admin workflow
Phase 4 (Infobiz)         → New template, largest scope
Phase 5 (Theming/i18n)    → Final polish
```

## Directus Setup Checklist

Before coding each phase, create the required collections/fields in Directus admin:

- [ ] Phase 1: Add `image` field to `services` collection (UUID type, interface: image)
- [ ] Phase 2.1: Create `working_hours` collection
- [ ] Phase 2.2: Create `staff` collection, add `staff_id` to `services`
- [ ] Phase 2.3: Create `blocked_dates` collection
- [ ] Phase 3.1: Create `product_categories` collection
- [ ] Phase 3.2: Create `product_variants` collection
- [ ] Phase 3.3: Add `stock_quantity` to `products`
- [ ] Phase 3.4: Create `promo_codes` collection
- [ ] Phase 4.1: Create `info_products`, `leads` collections; add `type` to `orders`
- [ ] All new collections: Set public role permissions (CREATE for user-facing, READ via admin token)
