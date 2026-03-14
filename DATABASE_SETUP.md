# Directus Database Setup

После `docker-compose down -v` база данных очищается. Нужно создать коллекции и данные.

## Вариант 1: Через UI (быстро)

1. **Открой** http://localhost:8055
   - Логин: `admin@example.com`
   - Пароль: `admin`

2. **Создай коллекции:**

   **Tenants:**
   - Settings → Data Model → Create Collection → Tenants
   - Fields: name (String), slug (String), config (JSON), created_at (Timestamp)

   **Products:**
   - Create Collection → Products
   - Fields: name (String), price (Decimal), description (Text), category (String), status (String), tenant_id (String), created_at (Timestamp)

   **Services:**
   - Create Collection → Services
   - Fields: name (String), price (Decimal), duration (Integer), description (Text), category (String), status (String), tenant_id (String), created_at (Timestamp)

3. **Добавь данные:**

   **Tenants:**
   ```
   Name: Mario Pizza
   Slug: pizza
   Config: {"theme":{"primaryColor":"#FF6B6B"},"businessType":"ecommerce"}

   Name: Blade & Fade
   Slug: barber
   Config: {"theme":{"primaryColor":"#1a1a2e"},"businessType":"booking"}
   ```

   **Products (4 товара):**
   ```
   Name: Margherita Pizza, Price: 12.99, Category: Pizza, Status: published, tenant_id: pizza
   Name: Pepperoni Pizza, Price: 14.99, Category: Pizza, Status: published, tenant_id: pizza
   ```

   **Services (4 услуги):**
   ```
   Name: Classic Haircut, Price: 35, Duration: 45, Category: Haircut, Status: active, tenant_id: barber
   Name: Beard Trim, Price: 20, Duration: 30, Category: Beard, Status: active, tenant_id: barber
   ```

## Вариант 2: Скриптом

```bash
cd /Users/artem/Desktop/tma/tma-template
docker-compose exec -T tma-dev npx tsx scripts/init-directus.ts
```

## Проверка

Открой http://localhost:3009/?tenant=pizza
- Должна загрузиться страница Mario Pizza
- Товары должны отображаться
