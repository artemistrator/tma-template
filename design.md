Ниже — схема, которую можно прямо превращать в правила генерации для оркестратора. Я опираюсь на три слоя:

1. Telegram Mini Apps как среду исполнения: safe area, theming, fullscreen, нативные кнопки и поведение. ([Telegram Core][1])
2. системные паттерны качества из Apple HIG и Material 3: ясная иерархия, слои, материалы, выразительные, но контролируемые компоненты. ([Apple Developer][2])
3. e-commerce UX-исследования Baymard для конверсии на мобильном. ([Baymard Institute][3])

Я бы делал не просто “3 шаблона”, а **3 премиум-архетипа**, у каждого — своя логика доверия, фокус внимания и композиция.

---

# Общие правила для всех 3 шаблонов

## 1) Что обязательно должно быть в premium-mini-app

**Четкая визуальная иерархия.**
На экране всегда должен быть один главный объект внимания: hero-блок, карточка продукта, слот времени, урок или CTA. Apple прямо рекомендует строить интерфейс через ясную иерархию и отделение ключевых элементов от второстепенных. ([Apple Developer][2])

**Слои, а не шум.**
Премиум-ощущение создают 3–4 уровня поверхности: фон, базовый слой, приподнятая карточка, sticky CTA/sheet. Это лучше, чем десять разных декоративных контейнеров. Apple materials и Material 3 cards оба поддерживают именно такую логику. ([Apple Developer][4])

**Один главный акцентный цвет.**
Нужна спокойная нейтральная база + один фирменный акцент + semantic colors для success/warning/error. Apple отдельно рекомендует использовать системные/adaptive цвета, хорошо работающие в разных appearance modes. Для Telegram Mini Apps это критично из-за светлой/темной темы клиента. ([Apple Developer][5])

**Нативная адаптация под Telegram.**
Шаблон обязан учитывать safe area inset, content safe area, поддержку fullscreen, тему Telegram и стандартное поведение кнопок. Если mini app визуально хорош, но ломается по safe area или спорит с темой Telegram, он не ощущается premium. ([Telegram Core][1])

**Сильные состояния интерфейса.**
Loading, skeleton, empty, success, error, confirm, retry, offline — должны быть частью шаблона, а не “потом дорисуем”. Material 3 прямо выделяет progress indicators и системные компоненты как основу качества взаимодействия. ([Material Design][6])

## 2) Базовая дизайн-система для генератора

Зашей это как примитивы:

* spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32`
* radius scale: `12 / 16 / 20 / 24`
* shadow/elevation: `0 / low / mid / high`
* typography roles: `hero / title / section / body / meta / numeric`
* component density: `compact / balanced / spacious`
* CTA style: `sticky footer / inline / floating bottom`
* content reveal: `list / cards / sheet / stepper`
* motion level: `subtle / polished / expressive`

## 3) Общий чеклист “выглядит как топ”

Шаблон можно считать сильным, если:

* первый экран за 2–3 секунды отвечает на вопрос “что здесь делать?”
* есть один главный CTA, а не три равноправных
* верх экрана не перегружен мелочами
* карточки читаются без всматривания
* на темной теме не “умирает” контраст
* пустое состояние не выглядит как баг
* confirm/success экраны выглядят как завершение сценария, а не как системный alert
* все длинные флоу разбиты на шаги, sheets или progressive disclosure
  Это прямо соответствует и системным гайдлайнам по hierarchy/layout, и мобильной UX-логике. ([Apple Developer][2])

---

# Шаблон 1 — Ecommerce

Архетип: **“Luxury storefront + frictionless checkout”**

Главная цель: быстро вызвать желание, снизить сомнения и довести до покупки с минимумом когнитивной нагрузки. Для mobile commerce особенно важны guest checkout, удобное редактирование количества, понятные варианты доставки и ясная подача сроков доставки. ([Baymard Institute][3])

## A. Что должно быть на главном экране

### 1. Hero-блок

Обязательно:

* крупный визуальный блок или hero card
* короткое value proposition
* 1 главный CTA
* 1 secondary CTA, но слабее визуально

Должно выглядеть так:

* крупная карточка на 60–75% ширины/высоты видимой области первого экрана
* минимум мелких бейджей
* текст в 2–3 строки максимум
* акцент на одном предложении, не на куче преимуществ

Премиум-сигналы:

* спокойный фон
* большая фотография или clean 3D/product render
* мягкая глубина
* sticky CTA снизу

### 2. Лента категорий

Обязательно:

* 5–8 ключевых категорий
* либо pills/segmented chips, либо крупные image-cards
* не смешивать 3 стиля категорий одновременно

Что делает топ:

* категория не просто “иконка + текст”, а понятный entry-point
* виден приоритет ассортимента
* есть быстрый вход в “new”, “best”, “sale”, “for you”

### 3. Блок trust & urgency

Обязательно:

* рейтинг / отзывы / social proof
* доставка / возврат / гарантия
* прозрачный срок получения

Baymard отдельно подчеркивает, что доставка и сроки должны подаваться очень ясно; формулировка delivery date обычно понятнее, чем абстрактная “shipping speed”. ([Baymard Institute][3])

## B. Карточка товара — обязательная схема

Карточка товара должна содержать:

* крупную галерею
* цену и old price при скидке
* 1 строку главной выгоды
* варианты: размер / цвет / вкус / конфигурация
* trust row: доставка / возврат / наличие
* reviews preview
* sticky add-to-cart / buy-now

Премиум-правила:

* фото — главный герой
* переключатели вариантов крупные, тактильные
* описание дозировано через аккордеоны/sheets
* CTA всегда на виду

## C. Каталог / listing

Что обязательно:

* search сверху
* фильтры в bottom sheet
* сортировка отдельным control
* быстрые действия на карточке: favorite / preview / add

Что делает “топ 1”:

* карточки не слишком мелкие
* на mobile лучше 1–2 карточки в ряд, но не теснее
* фильтры не открывают “страницу-форму”, а живут в sheet
* поиск и фильтрация мгновенно обновляют результат

## D. Корзина

Обязательно:

* editable quantity кнопками, а не только текстовым вводом
* summary block
* промокод в раскрывающемся блоке или sheet
* стоимость доставки / налог / скидка показаны прозрачно
* финальная сумма визуально выделена

Baymard отмечает, что на мобильных количество товара лучше менять кнопками или кнопками + текстовым полем, а не усложнять редактирование. ([Baymard Institute][3])

## E. Checkout — самый важный блок

Чтобы шаблон был “топовым”, здесь должны быть:

* guest checkout как основной вариант
* 1-column flow
* автозаполнение где возможно
* минимальное число полей
* progress indicator по шагам
* прозрачные fulfillment options
* confirm screen с понятным next step

Baymard прямо пишет, что guest checkout должен быть самым заметным вариантом, а лишняя сложность с регистрацией и паролем ухудшает прохождение. ([Baymard Institute][3])

### Идеальная схема checkout

1. Contact
2. Delivery method
3. Address / pickup
4. Payment
5. Review
6. Success

### Premium-детали

* summary заказа всегда закреплен или легко доступен
* дата доставки показана конкретно
* ошибки валидируются мягко и локально
* payment screen визуально тише, чем product screen

## F. Обязательные экраны ecommerce-шаблона

Минимум:

* home
* category
* search results
* product details
* cart
* checkout
* order success
* orders/history
* favorites
* profile/settings

## G. Что убивает premium в ecommerce

* слишком много бейджей “хит/новинка/топ/скидка”
* 4 CTA на карточке
* мелкий текст в product page
* гигантские фильтры-анкеты
* обязательная регистрация до оплаты
* визуальный шум в checkout
  Эти проблемы напрямую бьют по mobile conversion. ([Baymard Institute][3])

---

# Шаблон 2 — Booking

Архетип: **“High-trust planner + fast reservation”**

Главная цель: снять тревогу, сделать выбор слота/объекта очевидным и дать чувство контроля над бронированием.

Booking — это не только каталог. Это почти всегда сценарий с риском ошибки: дата, время, тариф, отмена, подтверждение. Поэтому тут premium = не “вау-красота”, а **спокойствие, ясность и контроль**. Это согласуется с Apple HIG про hierarchy/layout и с общими mobile UX-принципами по сложным приложениям. ([Apple Developer][2])

## A. Первый экран booking

### 1. Search / intent module

Обязательно:

* “что бронируем”
* “когда”
* “сколько / кто”
* CTA “найти”

Варианты:

* отель/апартаменты
* услуга/мастер
* консультация/встреча
* столик/ивент

Как должно выглядеть:

* одна hero-search-card
* даты и участники внутри крупных ячеек
* primary CTA сразу на первом экране
* не больше 4 полей до первого действия

### 2. Trust bar

Обязательно:

* бесплатная отмена / изменение
* мгновенное подтверждение или время ответа
* рейтинг / количество отзывов
* безопасная оплата / гарантия

Для booking доверие — это часть дизайна, не просто текст внизу.

## B. Результаты поиска

Обязательная схема карточки:

* главное фото
* название
* location/context
* rating/reviews
* price/starting from
* главное преимущество
* availability cue
* CTA “выбрать” или “смотреть слоты”

Что делает интерфейс премиум:

* карточки просторные
* дата/время/условия считываются за секунду
* цена и условия отмены находятся рядом
* ключевой differentiator не спрятан в описание

## C. Выбор даты и времени

Это ядро booking-шаблона.

### Что обязано быть

* calendar или slot-picker
* clearly disabled states
* timezone awareness, если актуально
* быстрые пресеты: сегодня / завтра / ближайшее
* показывать доступность рядом с датой
* sticky selected summary

### Premium-логика

* сначала выбор дня, потом времени
* если времени нет — сразу альтернатива
* если выбран слот — он визуально “владеет экраном”
* не открывать тяжелые формы до момента, когда слот уже подтвержден

Лучший паттерн тут — staged flow:

1. выбрать объект/услугу
2. выбрать дату
3. выбрать слот
4. подтвердить данные
5. оплатить / забронировать
6. success + “что дальше”

## D. Экран объекта / услуги

Обязательно:

* image gallery
* title + subtitle
* rating/reviews
* short summary
* location/map cue или формат проведения
* policies: cancellation, duration, check-in/out, prep
* availability preview
* sticky CTA

Премиум-сигналы:

* один сильный hero block
* компактные facts chips
* reviews preview без простыни текста
* policies в раскрывающихся секциях или sheets

## E. Checkout / reservation confirmation

Обязательно:

* итоговый summary
* дата, время, длительность
* стоимость
* условия отмены
* контактные данные
* payment method
* финальное подтверждение

Должно быть очень спокойно визуально:

* белее/чище, чем browse-экраны
* минимум украшений
* максимум уверенности

## F. Success screen

Вот тут многие шаблоны слабые.

Должно быть:

* крупный статус success
* номер бронирования
* дата/время/место
* next actions: добавить в календарь / написать / открыть маршрут / перенести / отменить
* share / send to chat

Если mini app в Telegram, то особенно логично дать post-booking actions, связанные с мессенджерным контекстом.

## G. Обязательные экраны booking-шаблона

Минимум:

* home/search
* results
* object details
* calendar/date picker
* time slot selection
* reservation summary
* payment
* success
* upcoming bookings
* booking details/manage

## H. Что убивает premium в booking

* много полей до первого результата
* скрытые условия отмены
* цена отдельно, условия отдельно
* слабые disabled/loading states
* неудобный выбор времени
* success screen без next actions
* слишком “магазинная” визуальная логика, когда нужен режим уверенности

---

# Шаблон 3 — Инфобизнес

Архетип: **“Authority + transformation + progress”**

Тут premium не про “дорогой маркетинг”, а про ощущение:
**“я попал в сильный продукт, здесь понятный путь, экспертность оформлена дорого, а прогресс чувствуется”**.

Инфобизнес-шаблон может быть трех типов:

* продажа курса/продукта
* кабинет ученика
* воронка + контент + комьюнити
  Лучший шаблон должен уметь собирать все три режима.

## A. Главный принцип

В инфобизнесе нельзя делать просто “лендинг в виде приложения”.
Должно быть 3 ядра:

1. **ценность и доверие**
2. **структура пути**
3. **ощущение прогресса**

Это соответствует общим UX-принципам: интерфейс должен сразу объяснять purpose, главную ценность и следующую задачу пользователя. ([Nielsen Norman Group][7])

## B. Главный экран — 2 возможные модели

### Модель 1: Sales-first

Если это продажа продукта.

Обязательно:

* hero with promise
* proof block
* offer card
* CTA to start / enroll / get access
* preview of program/modules
* testimonials preview
* FAQ / guarantees
* expert block

### Модель 2: Member-first

Если это кабинет ученика.

Обязательно:

* progress hero
* “continue where you left off”
* next lesson / next task
* streak / progress / completion
* modules list
* schedule/events
* community/messages
* support/help

Премиум-логика:

* первый экран должен сразу показывать **“что делать дальше”**
* не просто список уроков, а guided path
* минимум маркетингового шума после покупки

## C. Структура продающего экрана

### 1. Hero

Обязательно:

* сильный headline
* 1 outcome
* 1 primary CTA
* visual authority cue: portrait/video/symbolic premium visual

### 2. Proof block

Обязательно:

* цифры
* кейсы
* logos / social proof
* testimonials
* before/after outcomes, если уместно

### 3. Program structure

Обязательно:

* модули
* формат обучения
* длительность
* бонусы
* что получит пользователь по итогам

### 4. Offer card

Обязательно:

* тариф
* что включено
* рассрочка/оплата, если есть
* дедлайн / ограничение / cohort dates
* CTA

### 5. Risk reducer

Обязательно:

* FAQ
* refund / guarantee / условия
* контакты / поддержка

## D. Личный кабинет / student area

Вот здесь и рождается premium, если сделано хорошо.

### Обязательная схема

**1. Hero прогресса**

* процент прохождения
* текущий модуль
* следующий шаг
* кнопка “продолжить”

**2. Лента пути**

* модули
* уроки
* completed / locked / current states
* estimated time

**3. Календарь / события**

* ближайшие созвоны
* дедлайны
* эфиры
* домашние задания

**4. Результаты / achievements**

* streak
* completed tasks
* certificates / badges
* milestones

**5. Комьюнити / support**

* чат
* куратор
* вопросы
* быстрые ссылки на помощь

### Premium-сигналы

* интерфейс как у продукта, а не как у “курсовой платформы 2019”
* уроки оформлены как media cards или clean list with progress
* progress визуально красивый, но не детский
* статус “что дальше” всегда очевиден

## E. Экран урока

Обязательно:

* media player / cover
* title
* meta: duration / module / status
* lesson summary
* attachments/materials
* CTA “mark complete” / “next lesson”
* notes / homework / comments

Что делает топ:

* урок не тонет в тексте
* материалы сгруппированы
* справа/снизу не наваливается 10 CTA
* есть сильное завершение: completed state + следующий шаг

## F. Платеж и доступ

Если шаблон продающий, нужен поток:

1. offer selected
2. payment
3. access granted
4. welcome / onboarding
5. first action

Критично:

* после оплаты пользователь не должен “потеряться”
* успех = не просто “оплата прошла”, а “вот твой стартовый маршрут”

## G. Обязательные экраны инфобизнес-шаблона

Минимум:

* landing / offer
* program overview
* pricing / tariff
* checkout
* welcome onboarding
* dashboard
* modules list
* lesson details
* calendar/events
* community/support
* profile/settings

## H. Что убивает premium в инфобизнесе

* слишком агрессивный маркетинговый шум
* нет перехода от продажи к продукту
* кабинет выглядит как список ссылок
* нет прогресса и next step
* отзывы и доказательства оформлены дешево
* после оплаты нет wow-момента и маршрута

---

# Как сделать, чтобы эти 3 шаблона выглядели “топ1”, а не стандартно

## 1) У каждого шаблона должен быть свой визуальный характер

Не делай один и тот же layout с разными иконками.

### Ecommerce

Визуальный характер:

* эмоциональный
* tactile
* image-first
* акцент на desire + trust

### Booking

Визуальный характер:

* спокойный
* уверенный
* structured
* акцент на clarity + reassurance

### Инфобизнес

Визуальный характер:

* authoritative
* aspirational
* progress-driven
* акцент на transformation + guidance

## 2) Один и тот же компонент должен менять поведение по типу шаблона

Пример hero-card:

* ecommerce: большой продукт + цена + CTA
* booking: поиск + дата + availability + CTA
* инфобизнес: оффер или прогресс + next step + CTA

## 3) У каждого шаблона должен быть свой success-state

Это очень недооценено.

* ecommerce: “заказ оформлен” + track order + continue shopping
* booking: “бронирование подтверждено” + add to calendar + manage booking
* инфобизнес: “доступ открыт” + start lesson 1 / continue journey

## 4) Не генерируй “экраны”, генерируй “сцены”

Сцена = intent + hierarchy + CTA + trust + state.

Например:

* `ProductHeroScene`
* `SlotSelectionScene`
* `CourseProgressScene`

Так ты избежишь шаблонности.

---

# Прямой production-чеклист для оркестратора

## Для любого шаблона перед генерацией проверять:

* есть ли 1 главный CTA на экране
* есть ли hero block
* есть ли trust signals
* есть ли sticky action zone
* есть ли empty/loading/success/error states
* есть ли dark/light adaptation
* safe area respected
* bottom sheet используется там, где нужен краткий выбор/фильтр/условия
* форма разбита на шаги, если больше 5 полей
  Telegram safe area/theming и системные паттерны тут обязательны. ([Telegram Core][1])

## Для ecommerce дополнительно:

* guest checkout prominent
* quantity editable via buttons
* delivery date clear
* filters in sheet
* cart summary visible
* trust info near purchase
  ([Baymard Institute][3])

## Для booking дополнительно:

* search intent first
* date/time selection staged
* cancellation policy visible
* price + conditions shown together
* success screen has post-booking actions

## Для инфобизнеса дополнительно:

* promise or progress visible on first screen
* path structure visible
* next step always obvious
* social proof or authority block present
* after-payment onboarding present

---

# Если свести совсем в короткую формулу

**Ecommerce** = желание + доверие + быстрый checkout
**Booking** = ясность + контроль + уверенность
**Инфобизнес** = экспертность + путь + прогресс

А **premium** во всех трех случаях =
**спокойная иерархия + крупные блоки + минимум шума + сильные состояния + нативность Telegram**. ([Telegram Core][1])

