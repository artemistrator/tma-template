# Pre-Production: Admin Panel + Payments + Delivery

---

## 1. Tenant Admin Panel (PRIORITY)

### Проблема

Сейчас вся админка — это Directus CMS + страница `/orchestrator`. Directus видит ВСЕ теnanты и ВСЕ данные. Отдать такой доступ владельцу пиццерии нельзя — он увидит данные барбера и наоборот.

Нужно: владелец бизнеса получает доступ ТОЛЬКО к своему тенанту. Видит заказы, товары, аналитику. Не видит ничего чужого.

### Архитектура: два варианта

#### Вариант A: Кастомная админка в Next.js (рекомендую)

```
/admin/[slug]/           — dashboard (заказы сегодня, выручка, статусы)
/admin/[slug]/orders     — список заказов / бронирований
/admin/[slug]/orders/[id] — детали заказа, смена статуса
/admin/[slug]/products   — товары / услуги / инфопродукты (CRUD)
/admin/[slug]/analytics  — графики, конверсия, средний чек
/admin/[slug]/settings   — бизнес-настройки, платежи, доставка
/admin/[slug]/staff      — (booking) управление персоналом и расписанием
```

**Плюсы:**
- Полный контроль над UX — делаем простой интерфейс для не-технического пользователя
- Изоляция данных по дизайну (middleware проверяет права)
- Тот же стек (Next.js + Directus как data layer)
- Можно сделать Telegram-native авторизацию (владелец — Telegram-пользователь)

**Минусы:**
- Надо писать UI (но компоненты shadcn/ui уже есть)

#### Вариант B: Directus roles per tenant

Для каждого тенанта создаём роль в Directus с row-level permissions (`tenant_id = 'my-slug'`). Владелец логинится в Directus напрямую.

**Плюсы:**
- Нет кастомного кода — Directus уже умеет CRUD

**Минусы:**
- Directus UI сложный для не-технического владельца бизнеса
- Нельзя white-label
- Нет мобильной оптимизации
- Надо управлять ролями (создавать при каждом тенанте)
- Владелец видит "CMS" а не "мою админку"

### Рекомендация: Вариант A

Для продукта, где клиент — владелец барбершопа или пиццерии — Directus слишком сложен. Нужна простая кастомная админка.

### Авторизация

**Telegram-native auth** — самый естественный для TMA:

1. В Directus добавляем коллекцию `tenant_admins`:
```
tenant_admins:
  id: auto
  tenant_id: string (slug)
  telegram_id: number (Telegram user ID)
  role: 'owner' | 'manager'
  name: string
  created_at: datetime
```

2. При создании тенанта (orchestrator pipeline) — автоматически добавляем `telegram_id` создателя как `owner`.

3. Админ открывает ссылку вида `https://app.example.com/admin/my-pizza` — проходит авторизацию через Telegram WebApp SDK (initData + валидация на сервере).

4. Middleware проверяет:
```typescript
// /src/middleware.ts или /src/lib/admin/auth.ts
async function requireTenantAdmin(request: NextRequest, slug: string) {
  const telegramId = validateTelegramInitData(request); // из заголовка
  const admin = await directusFetch(
    `/items/tenant_admins?filter[tenant_id][_eq]=${slug}&filter[telegram_id][_eq]=${telegramId}&limit=1`
  );
  if (!admin.data?.[0]) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return admin.data[0]; // { role, name, ... }
}
```

5. ВСЕ запросы к данным фильтруются по `tenant_id` — даже если middleware сломан, SQL-инъекция невозможна, т.к. Directus REST API изолирует данные через фильтры.

### Что видит владелец по типу бизнеса

| Раздел | Ecommerce | Booking | Infobiz |
|--------|-----------|---------|---------|
| Dashboard | Заказы, выручка, остатки | Записи сегодня, загрузка | Продажи, конверсия |
| Orders/Bookings | Заказы + статусы | Бронирования + календарь | Покупки + доступы |
| Catalog | Товары (CRUD, остатки, цены) | Услуги (CRUD, цены, длительность) | Продукты (CRUD, контент) |
| Staff | - | Мастера + расписание | - |
| Analytics | Выручка, средний чек, топ товары | Загрузка, популярные услуги | Конверсия воронки |
| Settings | Доставка, оплата, промокоды | Рабочие часы, оплата | Оплата, доступы |

### Что нужно в Directus

Новая коллекция:
- `tenant_admins` (tenant_id, telegram_id, role, name, created_at)

Новый tool для оркестратора:
- `add_tenant_admin` — добавляет запись в `tenant_admins` при создании тенанта

### Порядок разработки

1. **Коллекция `tenant_admins` в Directus** + API для CRUD
2. **Auth middleware** — валидация Telegram initData + проверка прав
3. **Dashboard page** `/admin/[slug]` — метрики за сегодня/неделю
4. **Orders page** `/admin/[slug]/orders` — список + детали + смена статуса
5. **Products/Services page** `/admin/[slug]/products` — CRUD
6. **Settings page** `/admin/[slug]/settings` — базовые настройки
7. **Интеграция в оркестратор** — при создании тенанта добавлять admin-пользователя
8. **Staff + Schedule** (booking only)
9. **Analytics** — графики (recharts или chart.js)

### Открытые вопросы

- **Как владелец получает ссылку?** Бот отправляет после создания? QR-код? Ссылка в success-экране оркестратора?
- **Несколько админов?** Владелец может добавить менеджера? (role: 'manager' с ограниченными правами)
- **Push-уведомления?** Бот отправляет владельцу уведомление о новом заказе? (уже есть базовый Telegram notification)

---

## 2. Оплата (YooKassa)

### Текущее состояние

- Telegram Stars (XTR) — уже работает (`/api/orders/stars-invoice`)
- Webhook обработка `successful_payment` — уже есть
- Заглушка в `/api/create-invoice` — пустая

### Архитектура YooKassa

YooKassa работает по схеме: **создать платёж → редирект → webhook подтверждения**.

```
[Checkout] → POST /api/payments/create → YooKassa API → return confirmation_url
     ↓
[Redirect to YooKassa] → пользователь платит
     ↓
[YooKassa webhook] → POST /api/payments/webhook → обновить статус заказа
```

### Хранение ключей

В `tenant.config` добавляем:
```typescript
config: {
  // ... existing fields
  payments?: {
    yookassa?: {
      shopId: string;        // ID магазина в YooKassa
      secretKey: string;     // Секретный ключ (хранить зашифрованным!)
      testMode: boolean;     // true = тестовые платежи
    };
    methods: ('stars' | 'yookassa' | 'cash')[]; // доступные способы
    // В будущем: stripe, tinkoff, etc.
  };
}
```

### Что нужно создать

#### API endpoints:

```
POST /api/payments/create
  body: { orderId, tenantSlug, method: 'yookassa' | 'stars' }
  → Создаёт платёж в YooKassa, возвращает confirmation_url

POST /api/payments/webhook
  → Принимает уведомления от YooKassa (ip whitelist + hmac проверка)
  → Обновляет статус заказа в Directus

GET /api/payments/status?orderId=...&tenant=...
  → Проверяет статус платежа (для polling на клиенте)
```

#### YooKassa client:

```typescript
// src/lib/payments/yookassa.ts
class YooKassaClient {
  constructor(shopId: string, secretKey: string) {}

  async createPayment(params: {
    amount: number;
    currency: string; // 'RUB'
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; confirmationUrl: string }>

  async getPayment(paymentId: string): Promise<PaymentStatus>

  validateWebhook(body: string, signature: string): boolean
}
```

#### Фронтенд (Payment button):

Текущий `PaymentButton` модифицируется:
```
1. Создаёт заказ (POST /api/orders)
2. Если метод 'stars' → открыть Telegram invoice (уже есть)
3. Если метод 'yookassa' → получить confirmation_url → window.open() или Telegram.WebApp.openLink()
4. Если метод 'cash' → просто показать success (оплата при получении)
5. Polling /api/payments/status пока ждём подтверждения
```

### Заглушки (что можно сделать сейчас)

1. **`src/lib/payments/yookassa.ts`** — класс с методами, но вместо реальных вызовов возвращает `testMode: true` + mock данные
2. **`POST /api/payments/create`** — принимает запрос, в тестовом режиме сразу "подтверждает" оплату
3. **`POST /api/payments/webhook`** — endpoint есть, но пока обрабатывает только тестовые события
4. **UI** — в `PaymentButton` добавить выбор метода оплаты (Stars / YooKassa / Наличные), пока YooKassa показывает "тестовый режим"

### Настройка через оркестратор

Добавить в brief-form секцию "Оплата":
- Checkbox: Telegram Stars
- Checkbox: YooKassa (+ поля shopId/secretKey)
- Checkbox: Наличные при получении
- Пока нет ключей YooKassa — показывать "тестовый режим"

### Порядок разработки

1. **Заглушка `yookassa.ts`** — интерфейс + mock + флаг `testMode`
2. **API `/api/payments/create`** — роутинг по методам (stars/yookassa/cash)
3. **API `/api/payments/webhook`** — обработка YooKassa notifications
4. **UI выбора оплаты** в чекауте (stars / yookassa / cash)
5. **Tenant config** — добавить `payments` секцию
6. **Реальная интеграция** — заменить mock на настоящие вызовы API
7. **Admin panel** — раздел "Платежи" (настройка ключей, история)

---

## 3. Доставка (только Ecommerce)

### Текущее состояние

- Checkout-форма уже собирает адрес (name, phone, address, city, zipCode, country)
- Geolocation через OpenStreetMap Nominatim уже есть
- `shipping_address` уже хранится в заказе
- Нет: выбора способа доставки, расчёта стоимости, трекинга

### Архитектура

В `tenant.config` добавляем:
```typescript
config: {
  // ... existing fields
  delivery?: {
    methods: Array<{
      id: string;           // 'pickup' | 'courier' | 'post'
      name: string;         // "Самовывоз" | "Курьер" | "Почта"
      price: number;        // 0 = бесплатно
      freeFrom?: number;    // Бесплатно от суммы (напр. от 2000 руб)
      estimatedDays?: string; // "1-2 дня" | "30 минут" | "3-5 дней"
      description?: string; // Доп. инфо
    }>;
    defaultMethod?: string; // id метода по умолчанию
  };
}
```

### Что нужно создать

#### В чекауте (модификация существующего):

```
Шаг 1: Контакты (имя, телефон) ← уже есть
Шаг 2: Способ доставки ← НОВОЕ
  - Самовывоз (бесплатно, адрес точки)
  - Курьер (300 руб, бесплатно от 2000)
  - Почта (250 руб, 3-5 дней)
Шаг 3: Адрес (если не самовывоз) ← уже есть
Шаг 4: Оплата ← модификация
Шаг 5: Подтверждение ← уже есть
```

#### API (заглушка):

```
POST /api/delivery/calculate
  body: { tenantSlug, method, address, cartTotal }
  → { price, estimatedDays, freeDelivery: boolean }
```

Пока: берёт цену из `tenant.config.delivery.methods` без реального расчёта. В будущем можно подключить СДЭК, DPD и т.д.

#### В заказе:

Добавить поля:
```typescript
Order {
  // ... existing
  delivery_method?: string;    // 'pickup' | 'courier' | 'post'
  delivery_price?: number;     // стоимость доставки
  delivery_status?: 'pending' | 'shipped' | 'in_transit' | 'delivered';
  tracking_number?: string;    // номер отслеживания
}
```

### Заглушки (что можно сделать сейчас)

1. **Delivery method selector** в чекауте — выбор из вариантов в tenant config
2. **Пересчёт total** — cart total + delivery price
3. **Delivery config** — дефолтные методы при создании ecommerce тенанта
4. **В заказе** — сохранять выбранный метод и стоимость доставки
5. **В админке** — менять delivery_status заказа

### Настройка через оркестратор

При создании ecommerce тенанта — дефолтные методы доставки:
```json
{
  "delivery": {
    "methods": [
      { "id": "pickup", "name": "Самовывоз", "price": 0 },
      { "id": "courier", "name": "Доставка курьером", "price": 300, "freeFrom": 2000, "estimatedDays": "1-2 дня" }
    ],
    "defaultMethod": "courier"
  }
}
```

LLM-генерация: оркестратор сам подставляет разумные методы доставки исходя из типа бизнеса.

### Порядок разработки

1. **Config schema** — добавить `delivery` в tenant config
2. **Delivery selector** в checkout-form
3. **Пересчёт суммы** (cart + delivery) в cart-store и checkout
4. **Сохранение** delivery_method + delivery_price в заказе
5. **Admin panel** — менять delivery_status
6. **Оркестратор** — дефолтные методы доставки при создании

---

## 4. Общий порядок работ

### Фаза 1: Админка (основа) — СНАЧАЛА

1. Коллекция `tenant_admins` в Directus
2. Telegram auth middleware
3. Dashboard `/admin/[slug]`
4. Orders list + detail + status change
5. Products/Services CRUD
6. Интеграция в оркестратор (auto-add admin)

### Фаза 2: Платежи — ПОСЛЕ АДМИНКИ

7. YooKassa client (заглушка → реальный)
8. Payment API endpoints
9. Payment method selection в чекауте
10. Webhook обработка
11. Платежи в админке (настройка + история)

### Фаза 3: Доставка — ПОСЛЕ ПЛАТЕЖЕЙ

12. Delivery config schema
13. Delivery selector в checkout
14. Delivery tracking в админке
15. Оркестратор: дефолтные методы доставки

---

## 5. Вопросы для решения перед стартом

### По админке:
- [ ] Telegram auth: через initData (WebApp) или через bot deeplink + callback?
- [ ] Нужна ли мобильная версия админки? (если да — приоритизировать mobile-first)
- [ ] Один URL на все тенанты (`/admin/[slug]`) или отдельные домены/сабдомены?
- [ ] Роли: достаточно owner/manager или нужны более гранулярные?

### По платежам:
- [ ] Есть ли уже аккаунт YooKassa для тестов?
- [ ] Кто хранит ключи YooKassa — каждый тенант свои или один общий? (маркетплейс vs. direct)
- [ ] Нужна ли оплата наличными? Рассрочка?
- [ ] Минимальная сумма для онлайн-оплаты?

### По доставке:
- [ ] Нужна ли интеграция с реальными службами (СДЭК, DPD) или достаточно ручных методов?
- [ ] Расчёт стоимости: фиксированная цена или по расстоянию/весу?
- [ ] Самовывоз: нужен ли выбор из нескольких точек?
