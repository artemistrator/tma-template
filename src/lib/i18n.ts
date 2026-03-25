/**
 * Minimal i18n system for the TMA template.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   t('nav.home')       // → 'Home'   (en)  or 'Главная' (ru)
 *   t('product.buyPdf') // → 'Buy PDF' (en)  or 'Купить PDF' (ru)
 *
 * Adding a new locale: add an entry to `translations` with the same shape as 'en'.
 * Adding a new key: add to every locale object (TypeScript will catch missing keys).
 */

const translations = {
  en: {
    nav: {
      home: 'Home',
      catalog: 'Catalog',
      products: 'Products',
      services: 'Services',
      cart: 'Cart',
      orders: 'Orders',
      bookings: 'Bookings',
      contact: 'Contact',
      favorites: 'Saved',
      purchases: 'Purchases',
    },
    product: {
      buyPdf: 'Buy PDF',
      enrollNow: 'Enroll now',
      buyNow: 'Buy now',
      getFree: 'Get for free',
      bookSession: 'Book a session',
      backToCatalog: '← Back to catalog',
      notFound: 'Product not found',
      noProductSelected: 'No product selected.',
      goToCatalog: '← Go to catalog',
      free: 'Free',
      viewDetails: 'View details',
    },
    checkout: {
      processing: 'Processing...',
      payWithStars: 'Pay {price} with ⭐ Stars',
      getFree: 'Get for free',
      yourDetails: 'Your details',
      name: 'Name',
      email: 'Email',
      emailNote: '(for delivery)',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'your@email.com',
      back: '← Back',
      fillDetails: 'Please fill in your name and email',
      noProduct: 'No product selected',
      noTelegramAccount: 'Could not identify your Telegram account. Please open this in Telegram.',
      networkError: 'Network error. Please try again.',
      paymentCancelled: 'Payment was cancelled or failed. Please try again.',
    },
    leadForm: {
      defaultTitle: 'Contact Us',
      defaultDescription: "Leave your details and we'll get back to you shortly.",
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'your@email.com',
      phonePlaceholder: '+1 234 567 8900',
      submit: 'Send',
      submitting: 'Sending...',
      successTitle: 'Thank you!',
      successText: "We've received your details and will be in touch soon.",
      validationError: 'Please enter your name (at least 2 characters).',
    },
    validation: {
      nameMin: 'Name must be at least 2 characters',
      phoneInvalid: 'Please enter a valid phone number',
      selectDateTime: 'Please select date and time',
      selectStaff: 'Please select a specialist',
      fillRequired: 'Please fill in all required fields correctly',
      timeout: 'Request timed out. Please try again.',
      bookingFailed: 'Failed to create booking',
    },
    status: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
    booking: {
      title: 'Book Appointment',
      service: 'Service',
      selectDate: 'Select Date',
      selectTimeAndSpecialist: 'Select Time & Specialist',
      yourInfo: 'Your Information',
      nameLabel: 'Your Name',
      phonelabel: 'Phone Number',
      emailLabel: 'Email (optional)',
      notesLabel: 'Notes (optional)',
      notesPlaceholder: 'Any special requests or notes...',
      selectDateAndTime: 'Select Date & Time',
      confirmBooking: 'Confirm Booking',
      confirming: 'Confirming...',
    },
    common: {
      back: '← Back',
      loading: 'Loading...',
      loadingApp: 'Loading application...',
      failedLoad: 'Failed to load application',
      tryAgain: 'Try Again',
    },
  },

  ru: {
    nav: {
      home: 'Главная',
      catalog: 'Каталог',
      products: 'Продукты',
      services: 'Услуги',
      cart: 'Корзина',
      orders: 'Заказы',
      bookings: 'Записи',
      contact: 'Контакты',
      favorites: 'Избранное',
      purchases: 'Покупки',
    },
    product: {
      buyPdf: 'Купить PDF',
      enrollNow: 'Записаться',
      buyNow: 'Купить',
      getFree: 'Получить бесплатно',
      bookSession: 'Записаться на консультацию',
      backToCatalog: '← Назад к каталогу',
      notFound: 'Продукт не найден',
      noProductSelected: 'Продукт не выбран.',
      goToCatalog: '← В каталог',
      free: 'Бесплатно',
      viewDetails: 'Подробнее',
    },
    checkout: {
      processing: 'Обработка...',
      payWithStars: 'Оплатить {price} ⭐ Звёздами',
      getFree: 'Получить бесплатно',
      yourDetails: 'Ваши данные',
      name: 'Имя',
      email: 'Email',
      emailNote: '(для доставки)',
      namePlaceholder: 'Ваше имя',
      emailPlaceholder: 'ваш@email.com',
      back: '← Назад',
      fillDetails: 'Пожалуйста, заполните имя и email',
      noProduct: 'Продукт не выбран',
      noTelegramAccount: 'Не удалось определить ваш аккаунт Telegram. Откройте приложение в Telegram.',
      networkError: 'Ошибка сети. Попробуйте ещё раз.',
      paymentCancelled: 'Оплата отменена или не прошла. Попробуйте снова.',
    },
    leadForm: {
      defaultTitle: 'Свяжитесь с нами',
      defaultDescription: 'Оставьте свои данные и мы свяжемся с вами в ближайшее время.',
      name: 'Имя',
      email: 'Email',
      phone: 'Телефон',
      namePlaceholder: 'Ваше имя',
      emailPlaceholder: 'ваш@email.com',
      phonePlaceholder: '+7 999 123 45 67',
      submit: 'Отправить',
      submitting: 'Отправка...',
      successTitle: 'Спасибо!',
      successText: 'Мы получили ваши данные и скоро свяжемся с вами.',
      validationError: 'Пожалуйста, введите ваше имя (минимум 2 символа).',
    },
    validation: {
      nameMin: 'Имя должно содержать минимум 2 символа',
      phoneInvalid: 'Введите корректный номер телефона',
      selectDateTime: 'Выберите дату и время',
      selectStaff: 'Выберите специалиста',
      fillRequired: 'Пожалуйста, заполните все обязательные поля',
      timeout: 'Время запроса истекло. Попробуйте снова.',
      bookingFailed: 'Не удалось создать запись',
    },
    status: {
      pending: 'Ожидает',
      confirmed: 'Подтверждено',
      processing: 'В обработке',
      shipped: 'Отправлено',
      delivered: 'Доставлено',
      cancelled: 'Отменено',
    },
    booking: {
      title: 'Записаться',
      service: 'Услуга',
      selectDate: 'Выберите дату',
      selectTimeAndSpecialist: 'Выберите время и специалиста',
      yourInfo: 'Ваши данные',
      nameLabel: 'Ваше имя',
      phonelabel: 'Номер телефона',
      emailLabel: 'Email (необязательно)',
      notesLabel: 'Заметки (необязательно)',
      notesPlaceholder: 'Особые пожелания или заметки...',
      selectDateAndTime: 'Выберите дату и время',
      confirmBooking: 'Подтвердить запись',
      confirming: 'Подтверждение...',
    },
    common: {
      back: '← Назад',
      loading: 'Загрузка...',
      loadingApp: 'Загрузка приложения...',
      failedLoad: 'Не удалось загрузить приложение',
      tryAgain: 'Попробовать снова',
    },
  },
} as const;

type Locale = keyof typeof translations;
type TranslationTree = typeof translations.en;

// Flattened key paths (e.g. "nav.home", "product.buyPdf")
type DotPath<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends string
    ? `${Prefix}${string & K}`
    : DotPath<T[K], `${Prefix}${string & K}.`>;
}[keyof T];

type TranslationKey = DotPath<TranslationTree>;

/**
 * Resolves a dot-separated key against the translation tree.
 * Returns the key itself if not found (safe fallback).
 */
function resolve(tree: TranslationTree, key: string): string {
  const parts = key.split('.');
  let node: unknown = tree;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}

/**
 * Returns a typed translation function for the given locale.
 *
 * Usage (outside React):
 *   const { t } = createTranslator('ru');
 *   t('nav.home') // → 'Главная'
 */
export function createTranslator(locale: string) {
  const tree = (translations[locale as Locale] ?? translations.en) as TranslationTree;
  return {
    t: (key: TranslationKey, vars?: Record<string, string>) => {
      let str = resolve(tree, key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, v);
        }
      }
      return str;
    },
    locale,
  };
}
