# Calendar Booking Implementation Plan

## 📊 Current Schema Analysis

### ✅ Already Have:
- `bookings.date` (dateTime) - full date/time
- `bookings.service_id` (string) - which service
- `bookings.status` (string) - pending/confirmed/cancelled
- `services.duration` (integer) - duration in minutes

### ❌ Missing for Conflict Prevention:
- `bookings.start_time` (time) - extracted time for easier queries
- `bookings.end_time` (time) - calculated end time
- `bookings.service_duration` (integer) - cache of service duration
- Index on `(date, tenant_id)` for fast conflict queries

---

## 🎯 Implementation Plan

### Phase 1: Install Dependencies (15 min)

```bash
npm install react-day-picker date-fns
```

**Why react-day-picker:**
- Zero dependencies (except date-fns)
- Minimalist, easy to style with Telegram theme
- TypeScript out of the box
- Used by shadcn/ui
- Supports range selection, min/max dates

---

### Phase 2: Add Directus Fields (30 min)

**New fields in `bookings` collection:**

| Field | Type | Purpose |
|-------|------|---------|
| `start_time` | time | Extracted time for conflict queries |
| `end_time` | time | Calculated end time |
| `service_duration` | integer | Cache duration at booking time |

**Script: `scripts/add-booking-fields.ts`:**
```typescript
// Add fields via Directus API
- start_time (time, nullable)
- end_time (time, nullable)  
- service_duration (integer, nullable)

// Add index for performance
- Index on (date, tenant_id, status)
```

---

### Phase 3: Create Booking Availability API (1 hour)

**New endpoint: `POST /api/bookings/check-availability`**

**Request:**
```json
{
  "tenantId": "barber",
  "serviceId": "service-1",
  "duration": 45,
  "date": "2026-03-15"
}
```

**Response:**
```json
{
  "available": true,
  "availableSlots": [
    "09:00", "09:45", "10:30", "11:15",
    "14:00", "14:45", "15:30"
  ],
  "bookedSlots": [
    "12:00", "12:45", "13:30"
  ]
}
```

**Logic:**
1. Get all confirmed bookings for the date
2. Get service duration
3. Generate time slots (e.g., every 45 min)
4. Filter out booked slots
5. Return available slots

**File: `src/app/api/bookings/check-availability/route.ts`**

---

### Phase 4: Create Booking API Endpoint (30 min)

**New endpoint: `POST /api/bookings`**

**Request:**
```json
{
  "tenantId": "barber",
  "serviceId": "service-1",
  "customerName": "John",
  "customerPhone": "+1234567890",
  "date": "2026-03-15T12:00:00",
  "notes": "First time"
}
```

**Logic:**
1. Check if slot is still available (prevent race condition)
2. If available → create booking
3. Calculate end_time = start_time + duration
4. Send Telegram notification
5. Return booking ID

**File: `src/app/api/bookings/route.ts`** (update existing)

---

### Phase 5: Create Calendar Component (2 hours)

**File: `src/modules/booking/components/BookingCalendar.tsx`**

```typescript
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface BookingCalendarProps {
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  bookedDates: Date[]; // dates with no availability
  minDate?: Date;
  maxDate?: Date;
}

export function BookingCalendar({ 
  selectedDate, 
  onSelectDate,
  bookedDates,
  minDate,
  maxDate 
}: BookingCalendarProps) {
  // Use Telegram theme colors
  const { theme } = useTelegramContext();
  
  return (
    <DayPicker
      mode="single"
      selected={selectedDate}
      onSelect={onSelectDate}
      disabled={bookedDates}
      minDate={minDate || new Date()}
      maxDate={maxDate || addMonths(new Date(), 3)}
      // Style with Telegram theme
      classNames={{
        root: 'calendar-root',
        day: 'calendar-day',
        day_selected: 'calendar-day-selected',
        day_disabled: 'calendar-day-disabled',
      }}
    />
  );
}
```

**CSS: Style with Telegram theme:**
```css
.calendar-root {
  --rdp-background-color: var(--tg-bg);
  --rdp-accent-color: var(--tg-button);
  --rdp-text-color: var(--tg-text);
}
```

---

### Phase 6: Create Time Slots Component (1 hour)

**File: `src/modules/booking/components/TimeSlots.tsx`**

```typescript
interface TimeSlotsProps {
  date: Date;
  serviceId: string;
  selectedTime?: string;
  onSelectTime: (time: string) => void;
}

export function TimeSlots({ date, serviceId, selectedTime, onSelectTime }: TimeSlotsProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available slots from API
    fetch('/api/bookings/check-availability', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: config.meta.tenantId,
        serviceId,
        date: formatDate(date),
      }),
    })
      .then(r => r.json())
      .then(data => {
        setSlots(data.availableSlots);
        setLoading(false);
      });
  }, [date, serviceId]);

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map(time => (
        <Button
          key={time}
          variant={selectedTime === time ? 'default' : 'outline'}
          onClick={() => onSelectTime(time)}
        >
          {time}
        </Button>
      ))}
    </div>
  );
}
```

---

### Phase 7: Update BookingCheckoutForm (1 hour)

**File: `src/modules/booking/components/BookingCheckoutForm.tsx`**

**New flow:**
1. Select date (Calendar)
2. Select time (TimeSlots)
3. Fill customer info
4. Submit

```typescript
export function BookingCheckoutForm({ onSubmit }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [formData, setFormData] = useState({...});

  const handleSubmit = () => {
    // Combine date + time
    const bookingDateTime = combineDateTime(selectedDate, selectedTime);
    
    onSubmit({
      ...formData,
      date: bookingDateTime.toISOString(),
      tenantId: config.meta.tenantId,
    });
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Step 1: Calendar */}
        <BookingCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          bookedDates={bookedDates}
        />

        {/* Step 2: Time Slots */}
        {selectedDate && (
          <TimeSlots
            date={selectedDate}
            serviceId={selectedServiceId}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />
        )}

        {/* Step 3: Customer Info */}
        <Input name="customerName" ... />
        <Input name="customerPhone" ... />

        {/* Submit Button */}
        <Button onClick={handleSubmit} disabled={!selectedDate || !selectedTime}>
          Confirm Booking
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 8: Prevent Double Booking (30 min)

**Database constraint:**

```sql
-- Add unique constraint (via Directus UI or SQL)
-- Prevents exact same time slot for same tenant
ALTER TABLE bookings 
ADD CONSTRAINT unique_booking_time 
UNIQUE (tenant_id, date, status);
```

**API-level check (in POST /api/bookings):**

```typescript
// Check for conflicts before creating
const conflictingBooking = await directus.request(
  readItems('bookings', {
    filter: {
      tenant_id: { _eq: tenantId },
      date: { 
        _between: [startTime, endTime] // Check overlap
      },
      status: { _in: ['confirmed', 'pending'] }
    }
  })
);

if (conflictingBooking.length > 0) {
  throw new Error('Time slot already booked');
}
```

---

## 📋 Files to Create/Modify

### New Files:
1. `src/modules/booking/components/BookingCalendar.tsx`
2. `src/modules/booking/components/TimeSlots.tsx`
3. `src/app/api/bookings/check-availability/route.ts`
4. `scripts/add-booking-fields.ts`

### Modified Files:
1. `src/modules/booking/components/BookingCheckoutForm.tsx` - integrate calendar
2. `src/app/api/bookings/route.ts` - add conflict check
3. `src/lib/directus.ts` - add types for new fields

---

## 🎯 Step-by-Step Implementation Order

### Step 1: Install (5 min)
```bash
npm install react-day-picker date-fns
```

### Step 2: Add Directus Fields (30 min)
```bash
npx tsx scripts/add-booking-fields.ts
```

### Step 3: Create Availability API (1 hour)
```bash
# Create endpoint
touch src/app/api/bookings/check-availability/route.ts
```

### Step 4: Create Calendar Component (1 hour)
```bash
# Create component
touch src/modules/booking/components/BookingCalendar.tsx
```

### Step 5: Create TimeSlots Component (1 hour)
```bash
touch src/modules/booking/components/TimeSlots.tsx
```

### Step 6: Integrate into BookingCheckoutForm (1 hour)
```bash
# Update form
edit src/modules/booking/components/BookingCheckoutForm.tsx
```

### Step 7: Test (30 min)
```bash
# Test double booking prevention
1. User 1: Book 12:00 on Mar 15
2. User 2: Try to book 12:00 on Mar 15 → Should fail
3. User 2: Book 12:45 on Mar 15 → Should succeed
```

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Booking
```
1. Open /?tenant=barber
2. Click service → Add to cart
3. Go to Checkout
4. Select date: Mar 15
5. Select time: 12:00
6. Fill form → Submit
7. ✅ Booking created
```

### Scenario 2: Conflict Prevention
```
1. User 1 books 12:00 on Mar 15
2. User 2 opens calendar for Mar 15
3. 12:00 slot should be DISABLED or not shown
4. User 2 selects 12:45 → ✅ Success
```

### Scenario 3: Race Condition
```
1. User 1 and User 2 both see 12:00 available
2. Both click at same time
3. API checks for conflicts
4. User 1 succeeds, User 2 gets error "Slot already booked"
5. User 2 shown available slots again
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "react-day-picker": "^9.x",
    "date-fns": "^4.x"
  }
}
```

**Bundle size:**
- react-day-picker: ~15KB gzipped
- date-fns (tree-shaken): ~5KB gzipped
- **Total: ~20KB** (minimal impact)

---

## 🎨 Styling with Telegram Theme

```css
/* globals.css */
.calendar-root {
  --rdp-background-color: var(--tg-bg);
  --rdp-accent-color: var(--tg-button);
  --rdp-text-color: var(--tg-text);
  --rdp-selected-color: var(--tg-button);
  --rdp-selected-text-color: var(--tg-button-text);
  --rdp-today-color: var(--tg-secondary-bg);
}

.calendar-day {
  user-select: none;
  touch-action: manipulation;
}

.calendar-day-selected {
  background-color: var(--tg-button);
  color: var(--tg-button-text);
}

.calendar-day-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## ✅ Success Criteria

- [ ] User can select date from calendar
- [ ] User can select time from available slots
- [ ] Booked slots are not shown/disabled
- [ ] Double booking prevented at API level
- [ ] Telegram notification sent on booking
- [ ] Calendar styled with Telegram theme
- [ ] Works on iOS and Android
- [ ] Works in light and dark theme

---

**Estimated Total Time: 6-7 hours**

**Start with Step 1-2 (install + fields), then we'll implement step by step!** 🚀
