# RecruitmentTracker

Система для отслеживания рекрутинговых процессов управления кандидатами.

## 🚀 Возможности

- Управление кандидатами и вакансиями
- Отслеживание этапов собеседований
- Загрузка резюме и документов
- Уведомления по email и Telegram
- Панель администрирования
- Статистика и отчеты

## 🛠️ Технологический стек

### Frontend
- React 18
- TypeScript
- TailwindCSS
- Radix UI
- Wouter (роутинг)
- React Query
- React Hook Form + Zod

### Backend
- Node.js + Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- Passport.js (аутентификация)
- Multer (загрузка файлов)

## 📋 Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

## 🚀 Установка и запуск

1. **Клонирование репозитория**
   ```bash
   git clone <repository-url>
   cd RecruitmentTracker
   ```

2. **Установка зависимостей**
   ```bash
   npm install
   ```

3. **Настройка переменных окружения**
   ```bash
   cp .env.example .env
   ```
   
   Отредактируйте `.env` файл с вашими настройками:
   - `DATABASE_URL` - строка подключения к PostgreSQL
   - `SESSION_SECRET` - секретный ключ для сессий
   - `SUPER_ADMIN_PASSWORD` - пароль для суперпользователя

4. **Настройка базы данных**
   ```bash
   # Применить миграции
   npm run db:push
   ```

5. **Запуск приложения**
   ```bash
   # Разработка
   npm start
   
   # Production сборка
   npm run build
   npm run start:prod
   ```

## 🗄️ Структура проекта

```
RecruitmentTracker/
├── client/          # Frontend код
├── server/          # Backend код
├── shared/          # Общие типы и утилиты
├── migrations/      # Миграции базы данных
├── uploads/         # Загруженные файлы
└── public/          # Статические файлы
```

## 🔧 Доступные скрипты

- `npm start` - Запуск в режиме разработки
- `npm run build` - Сборка для production
- `npm run start:prod` - Запуск production версии
- `npm run check` - Проверка TypeScript
- `npm run db:push` - Применение миграций БД

## 📧 Email конфигурация

Поддерживаются два варианта:

### Resend (рекомендуется)
1. Зарегистрируйтесь на [Resend.com](https://resend.com)
2. Добавьте `RESEND_API_KEY` в `.env`

### SMTP
1. Настройте SMTP сервер в `.env`
2. Для Gmail потребуется [App Password](https://support.google.com/accounts/answer/185833)

## 🤖 Telegram бот (опционально)

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Добавьте `TELEGRAM_BOT_TOKEN` в `.env`
3. Бот будет отправлять уведомления о новых кандидатах

## 🔐 Безопасность

- Используйте криптостойкий `SESSION_SECRET` для production
- Регулярно обновляйте зависимости
- Настройте HTTPS для production
- Ограничьте доступ к загруженным файлам

## 📝 Лицензия

MIT License

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch
3. Сделайте коммиты
4. Отправьте Pull Request
