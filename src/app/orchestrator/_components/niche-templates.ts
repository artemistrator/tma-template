import type { AppType } from './brief-form';
import type { ItemData } from './items-editor';
import type { StaffMember } from './staff-editor';
import type { WorkingHourEntry } from './hours-editor';

export interface NicheTemplate {
  id: string;
  title: string;
  description: string;
  appType: AppType;
  locale: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  items: ItemData[];
  staff?: StaffMember[];
  workingHours?: WorkingHourEntry[];
}

const DEFAULT_WORK_HOURS: WorkingHourEntry[] = [
  { day_of_week: 0, start_time: '10:00', end_time: '18:00', is_day_off: true },
  { day_of_week: 1, start_time: '09:00', end_time: '20:00', is_day_off: false },
  { day_of_week: 2, start_time: '09:00', end_time: '20:00', is_day_off: false },
  { day_of_week: 3, start_time: '09:00', end_time: '20:00', is_day_off: false },
  { day_of_week: 4, start_time: '09:00', end_time: '20:00', is_day_off: false },
  { day_of_week: 5, start_time: '09:00', end_time: '20:00', is_day_off: false },
  { day_of_week: 6, start_time: '10:00', end_time: '18:00', is_day_off: false },
];

export const NICHE_TEMPLATES: NicheTemplate[] = [
  // ─── Ecommerce ───
  {
    id: 'pizza',
    title: 'Pizzeria',
    description: 'Pizza delivery with categories and cart',
    appType: 'ecommerce',
    locale: 'ru',
    currency: 'RUB',
    primaryColor: '#c0392b',
    secondaryColor: '#f39c12',
    items: [
      { name: 'Маргарита', price: 590, category: 'Пицца', description: 'Томатный соус, моцарелла, базилик' },
      { name: 'Пепперони', price: 690, category: 'Пицца', description: 'Томатный соус, моцарелла, пепперони' },
      { name: 'Четыре сыра', price: 750, category: 'Пицца', description: 'Моцарелла, дор-блю, пармезан, чеддер' },
      { name: 'Гавайская', price: 650, category: 'Пицца', description: 'Ветчина, ананасы, моцарелла' },
      { name: 'Кола 0.5л', price: 120, category: 'Напитки', description: 'Coca-Cola' },
      { name: 'Сок апельсиновый', price: 150, category: 'Напитки', description: 'Свежевыжатый' },
    ],
  },
  {
    id: 'clothing',
    title: 'Clothing Store',
    description: 'Fashion store with categories',
    appType: 'ecommerce',
    locale: 'en',
    currency: 'USD',
    primaryColor: '#1a1a1a',
    secondaryColor: '#c9a96e',
    items: [
      { name: 'Classic T-Shirt', price: 29.99, category: 'T-Shirts', description: '100% cotton, unisex fit' },
      { name: 'Slim Jeans', price: 79.99, category: 'Jeans', description: 'Stretch denim, slim fit' },
      { name: 'Hoodie', price: 59.99, category: 'Outerwear', description: 'Fleece lined, front pocket' },
      { name: 'Sneakers', price: 99.99, category: 'Shoes', description: 'Lightweight, breathable mesh' },
      { name: 'Baseball Cap', price: 24.99, category: 'Accessories', description: 'Adjustable strap, embroidered logo' },
    ],
  },
  {
    id: 'grocery',
    title: 'Grocery Delivery',
    description: 'Local grocery store with delivery',
    appType: 'ecommerce',
    locale: 'ru',
    currency: 'RUB',
    primaryColor: '#27ae60',
    secondaryColor: '#f1c40f',
    items: [
      { name: 'Молоко 1л', price: 89, category: 'Молочное', description: '3.2% жирности' },
      { name: 'Хлеб белый', price: 55, category: 'Выпечка', description: 'Свежий, нарезной' },
      { name: 'Яйца С1 10шт', price: 120, category: 'Яйца', description: 'Категория С1' },
      { name: 'Бананы 1кг', price: 95, category: 'Фрукты', description: 'Эквадор' },
      { name: 'Курица филе 1кг', price: 320, category: 'Мясо', description: 'Охлаждённое' },
      { name: 'Рис 1кг', price: 110, category: 'Крупы', description: 'Длиннозёрный' },
    ],
  },

  // ─── Booking ───
  {
    id: 'barbershop',
    title: 'Barbershop',
    description: 'Men\'s grooming with staff and time slots',
    appType: 'booking',
    locale: 'ru',
    currency: 'RUB',
    primaryColor: '#2c3e50',
    secondaryColor: '#e67e22',
    items: [
      { name: 'Мужская стрижка', price: 1500, category: 'Стрижки', description: 'Классическая или модельная', duration: 45 },
      { name: 'Стрижка бороды', price: 800, category: 'Борода', description: 'Моделирование и уход', duration: 30 },
      { name: 'Комбо: стрижка + борода', price: 2000, category: 'Комбо', description: 'Полный сервис', duration: 60 },
      { name: 'Камуфляж седины', price: 1200, category: 'Уход', description: 'Тонирование волос', duration: 30 },
    ],
    staff: [
      { name: 'Алексей', bio: 'Барбер, 5 лет опыта' },
      { name: 'Дмитрий', bio: 'Старший мастер, 8 лет опыта' },
    ],
    workingHours: DEFAULT_WORK_HOURS,
  },
  {
    id: 'beauty',
    title: 'Beauty Salon',
    description: 'Nail salon, lashes, spa',
    appType: 'booking',
    locale: 'ru',
    currency: 'RUB',
    primaryColor: '#e91e8c',
    secondaryColor: '#9b59b6',
    items: [
      { name: 'Маникюр классический', price: 1500, category: 'Маникюр', description: 'Обработка + покрытие', duration: 60 },
      { name: 'Маникюр с дизайном', price: 2200, category: 'Маникюр', description: 'С художественным дизайном', duration: 90 },
      { name: 'Педикюр', price: 2000, category: 'Педикюр', description: 'Классический педикюр', duration: 75 },
      { name: 'Наращивание ресниц', price: 3000, category: 'Ресницы', description: '2D-3D объём', duration: 120 },
      { name: 'Брови (архитектура)', price: 1200, category: 'Брови', description: 'Коррекция + окрашивание', duration: 45 },
    ],
    staff: [
      { name: 'Анна', bio: 'Nail-мастер, 6 лет' },
      { name: 'Мария', bio: 'Лэшмейкер, 4 года' },
      { name: 'Елена', bio: 'Brow-мастер' },
    ],
    workingHours: DEFAULT_WORK_HOURS,
  },
  {
    id: 'dental',
    title: 'Dental Clinic',
    description: 'Dental services with doctors',
    appType: 'booking',
    locale: 'en',
    currency: 'USD',
    primaryColor: '#2980b9',
    secondaryColor: '#1abc9c',
    items: [
      { name: 'Teeth Cleaning', price: 150, category: 'Preventive', description: 'Professional cleaning & polish', duration: 60 },
      { name: 'Dental Checkup', price: 100, category: 'Preventive', description: 'Comprehensive examination', duration: 30 },
      { name: 'Teeth Whitening', price: 350, category: 'Cosmetic', description: 'In-office whitening', duration: 90 },
      { name: 'Filling', price: 200, category: 'Restorative', description: 'Composite filling', duration: 45 },
    ],
    staff: [
      { name: 'Dr. Smith', bio: 'General Dentist, 10 years experience' },
      { name: 'Dr. Johnson', bio: 'Cosmetic Dentistry Specialist' },
    ],
    workingHours: [
      { day_of_week: 0, start_time: '09:00', end_time: '17:00', is_day_off: true },
      { day_of_week: 1, start_time: '08:00', end_time: '18:00', is_day_off: false },
      { day_of_week: 2, start_time: '08:00', end_time: '18:00', is_day_off: false },
      { day_of_week: 3, start_time: '08:00', end_time: '18:00', is_day_off: false },
      { day_of_week: 4, start_time: '08:00', end_time: '18:00', is_day_off: false },
      { day_of_week: 5, start_time: '08:00', end_time: '16:00', is_day_off: false },
      { day_of_week: 6, start_time: '09:00', end_time: '14:00', is_day_off: false },
    ],
  },

  // ─── Infobiz ───
  {
    id: 'online-school',
    title: 'Online School',
    description: 'Courses, webinars, digital products',
    appType: 'infobiz',
    locale: 'ru',
    currency: 'RUB',
    primaryColor: '#8e44ad',
    secondaryColor: '#f39c12',
    items: [
      { name: 'Основы маркетинга', price: 4990, category: 'Курсы', description: '12 уроков, домашние задания', type: 'course', slug: 'marketing-basics' },
      { name: 'SMM с нуля', price: 7990, category: 'Курсы', description: 'Полный курс по SMM', type: 'course', slug: 'smm-from-zero' },
      { name: 'Гайд: контент-план', price: 990, category: 'Гайды', description: 'PDF-гайд на 30 страниц', type: 'pdf', slug: 'content-plan-guide' },
      { name: 'Консультация 1-на-1', price: 5000, category: 'Консультации', description: '60 минут с экспертом', type: 'consultation', slug: 'consultation-1on1' },
      { name: 'Бесплатный вебинар', price: 0, category: 'Вебинары', description: 'Как начать зарабатывать в интернете', type: 'article', slug: 'free-webinar' },
    ],
  },
  {
    id: 'coaching',
    title: 'Personal Coach',
    description: 'Coaching sessions and digital products',
    appType: 'infobiz',
    locale: 'en',
    currency: 'USD',
    primaryColor: '#16a085',
    secondaryColor: '#e74c3c',
    items: [
      { name: 'Mindset Mastery Course', price: 197, category: 'Courses', description: '8-week transformational program', type: 'course', slug: 'mindset-mastery' },
      { name: 'Goal Setting Workbook', price: 27, category: 'Digital Products', description: 'PDF workbook with exercises', type: 'pdf', slug: 'goal-setting-workbook' },
      { name: '1-on-1 Coaching Session', price: 150, category: 'Coaching', description: '60-minute video call', type: 'consultation', slug: 'coaching-session' },
      { name: 'Free: 5 Morning Habits', price: 0, category: 'Free Resources', description: 'Article on building morning routine', type: 'article', slug: 'morning-habits' },
    ],
  },
];
