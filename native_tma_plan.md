# Native Telegram Mini App Implementation Plan

## ✅ Already Implemented

### Haptic Feedback
- ✅ `impactOccurred(style)` - light, medium, heavy, rigid, soft
- ✅ `notificationOccurred(type)` - success, warning, error
- ✅ `selectionChanged()` - for list selections

### Native Buttons
- ✅ `MainButton` - show/hide/setText/onClick
- ✅ `MainButton.showProgress()` - progress loader during payment
- ✅ `MainButton.hideProgress()` - hide loader
- ✅ `BackButton` - show/hide/onClick

### Theme Integration
- ✅ `themeParams` - all colors from Telegram
- ✅ `colorScheme` - light/dark detection
- ✅ CSS variables applied automatically (`--tg-bg`, `--tg-text`, etc.)

### Basic Setup
- ✅ `tg.ready()` - initialization
- ✅ `tg.expand()` - full screen
- ✅ `initDataUnsafe` - user data access

### Native Feel Enhancements (Phase 1 - COMPLETED ✅)
- ✅ `tg.enableClosingConfirmation()` - prevent accidental close
- ✅ `tg.disableVerticalSwipes()` - use our own scroll
- ✅ `tg.setHeaderColor()` - match app header
- ✅ `tg.setBackgroundColor()` - match app BG
- ✅ Viewport management (height, stableHeight)
- ✅ `viewportChanged` event listener

### CSS for Native Feel (Phase 1 - COMPLETED ✅)
- ✅ `user-select: none` - no text selection on tap
- ✅ `-webkit-tap-highlight-color: transparent` - remove blue highlight
- ✅ `touch-action: manipulation` - remove 300ms tap delay
- ✅ `overscroll-behavior: contain` - prevent scroll "leak"
- ✅ `-webkit-overflow-scrolling: touch` - smooth iOS scroll
- ✅ Safe area insets (`.safe-area-inset-*` classes)
- ✅ Margin variants (`.m-safe-top`, `.m-safe-bottom`)

---

## ❌ Missing Features (To Implement)

### 1. Enhanced Initialization
**Priority: HIGH**

```typescript
// Missing in use-telegram.ts:
- tg.enableClosingConfirmation() - prevent accidental close
- tg.disableVerticalSwipes() - if we have custom swipes
- tg.setHeaderColor(color) - match app header
- tg.setBackgroundColor(color) - match app BG
```

**Files to modify:**
- `src/lib/telegram/use-telegram.ts`
- `src/app/layout.tsx`

---

### 2. CSS for Native Feel
**Priority: HIGH**

```css
/* Add to globals.css */
* {
  user-select: none; /* No text selection on tap */
  -webkit-tap-highlight-color: transparent; /* Remove blue highlight */
  touch-action: manipulation; /* Remove 300ms tap delay */
}

html {
  overscroll-behavior: contain; /* Prevent scroll "leak" */
  -webkit-overflow-scrolling: touch; /* Smooth iOS scroll */
}

/* Safe area insets for iPhone notch */
.safe-area-inset-top { padding-top: env(safe-area-inset-top); }
.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-inset-left { padding-left: env(safe-area-inset-left); }
.safe-area-inset-right { padding-right: env(safe-area-inset-right); }
```

**Files to modify:**
- `src/app/globals.css`

---

### 3. Cloud Storage Integration
**Priority: MEDIUM**

```typescript
// New hook: useTelegramCloudStorage.ts
- getItem(key: string): Promise<string>
- setItem(key: string, value: string): Promise<void>
- getItems(keys: string[]): Promise<Object>
- setItems(items: Object): Promise<void>
- removeItem(key: string): Promise<void>
- getKeys(): Promise<string[]>
```

**Use cases:**
- Save cart between sessions
- Remember user preferences
- Store last viewed products

**Files to create:**
- `src/lib/telegram/use-cloud-storage.ts`

---

### 4. Biometric Authentication
**Priority: LOW (for future)**

```typescript
// New hook: useBiometric.ts
- isBiometricAvailable(): Promise<boolean>
- authenticate(): Promise<boolean>
- requestBiometricAccess(): Promise<void>
```

**Use cases:**
- Confirm high-value orders
- Access order history
- Payment confirmation

**Files to create:**
- `src/lib/telegram/use-biometric.ts`

---

### 5. Contact & Write Access Requests
**Priority: MEDIUM**

```typescript
// Already have requestContact in use-telegram-user.ts
// Missing:
- requestWriteAccess(): Promise<boolean>
```

**Use cases:**
- Request user contact (already implemented)
- Request permission to send messages

**Files to modify:**
- `src/lib/telegram/use-telegram.ts`

---

### 6. Native Loading States
**Priority: MEDIUM**

```typescript
// MainButton loader
tg.MainButton.showProgress(animate: boolean)
tg.MainButton.hideProgress()

// Use during:
- Payment processing
- Order submission
- Data loading
```

**Files to modify:**
- `src/lib/telegram/use-telegram.ts`
- `src/modules/ecommerce/components/payment-button.tsx`

---

### 7. Viewport Management
**Priority: HIGH**

```typescript
// Better viewport handling
- tg.viewportHeight - current viewport
- tg.viewportStableHeight - stable viewport (after animations)
- viewportChanged event listener
```

**Files to modify:**
- `src/lib/telegram/use-telegram.ts`
- `src/app/layout.tsx`

---

### 8. Native Share & Copy
**Priority: LOW**

```typescript
// Share functionality
- tg.shareUrl(url: string, text?: string)

// Copy to clipboard
- tg.writeToClipboard(text: string)
```

**Use cases:**
- Share products with friends
- Copy order ID
- Share promo codes

**Files to create:**
- `src/lib/telegram/use-share.ts`

---

### 9. Popup & Alert Enhancements
**Priority: MEDIUM**

```typescript
// Better popup support
- tg.showPopup(params: PopupParams, callback?: Function)
- tg.showMessage(params: MessageParams, callback?: Function)

// Types:
interface PopupParams {
  title?: string
  message: string
  buttons: PopupButton[]
}

interface PopupButton {
  id?: string
  type: 'default' | 'ok' | 'close' | 'cancel' | 'destructive' | 'request_phone' | 'request_location'
  text?: string
}
```

**Files to modify:**
- `src/lib/telegram/use-telegram.ts`

---

### 10. Location Request
**Priority: LOW (for delivery)**

```typescript
// Request user location
- tg.showLocationPopup()
- tg.requestLocation()
```

**Use cases:**
- Delivery address auto-fill
- Find nearest store
- Calculate delivery time

**Files to create:**
- `src/lib/telegram/use-location.ts`

---

### 11. Inline Query Support
**Priority: LOW**

```typescript
// For inline mode bots
- tg.switchInlineQuery(query: string, chat_types?: string[])
```

**Use cases:**
- Share products in chat
- Quick order from any chat

---

### 12. Download File
**Priority: LOW**

```typescript
// Download files from bot
- tg.downloadFile(file_id: string)
```

**Use cases:**
- Download invoice PDF
- Download receipt
- Download product catalog

---

## Implementation Priority

### Phase 1: Essential ✅ COMPLETED!
1. ✅ Enhanced Initialization (`enableClosingConfirmation`, `disableVerticalSwipes`, `setHeaderColor`, `setBackgroundColor`)
2. ✅ CSS for Native Feel (`user-select`, `tap-highlight`, `safe-area`)
3. ✅ Viewport Management (`viewportHeight`, `stableHeight`, event listener)
4. ✅ MainButton Loader (`showProgress`/`hideProgress`)

**Status: 100% COMPLETE! 🎉**

### Phase 2: User Experience (Week 2)
5. ⏸️ Cloud Storage Integration (save cart, preferences)
6. ⏸️ Contact & Write Access (`requestWriteAccess`)
7. ⏸️ Popup & Alert Enhancements (`showPopup`, `showMessage`)

### Phase 3: Advanced Features (Week 3-4)
8. ⏸️ Biometric Authentication
9. ⏸️ Native Share & Copy
10. ⏸️ Location Request
11. ⏸️ Inline Query Support
12. ⏸️ Download File

---

## Quick Wins (Can implement in 1-2 hours each)

1. **MainButton Progress Loader** - Show loader during payment
2. **CSS Safe Area Insets** - Fix iPhone notch issues
3. **enableClosingConfirmation** - Prevent accidental closes
4. **Cloud Storage for Cart** - Persist cart between sessions

---

## Testing Checklist

For each feature, test:
- [ ] Works in Telegram iOS
- [ ] Works in Telegram Android
- [ ] Works in Telegram Desktop
- [ ] Graceful fallback outside Telegram
- [ ] Works in light theme
- [ ] Works in dark theme

---

## Resources

- [Telegram WebApp API Docs](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps Examples](https://github.com/Telegram-Mini-Apps)

---

## Notes

- Always check `if (window.Telegram?.WebApp)` before using Telegram APIs
- Provide fallbacks for users outside Telegram
- Test on real devices, not just browser DevTools
- Keep haptic feedback subtle - don't overuse
- Follow iOS Human Interface Guidelines for iOS
- Follow Material Design for Android

---

**Status:** Ready to implement! 🚀

Start with Phase 1 (Essential) for maximum impact with minimal effort.
