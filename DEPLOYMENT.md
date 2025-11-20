# Развертывание RecruitmentTracker

## 🚀 Production развертывание

### 1. Подготовка сервера

**Требования:**
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Node.js 18+
- PostgreSQL 14+
- Nginx (опционально)
- SSL сертификат (рекомендуется)

### 2. Установка зависимостей

```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Создание базы данных
sudo -u postgres createdb recruit_pro
sudo -u postgres createuser --interactive
```

### 3. Развертывание приложения

```bash
# Клонирование репозитория
git clone <repository-url>
cd RecruitmentTracker

# Установка зависимостей
npm install --production

# Настройка переменных окружения
cp .env.example .env
nano .env  # отредактируйте с вашими настройками

# Применение миграций
npm run db:push

# Сборка проекта
npm run build
```

### 4. Запуск с PM2

```bash
# Установка PM2
npm install -g pm2

# Создание конфигурации PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'recruitment-tracker',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Создание директории для логов
mkdir -p logs

# Запуск приложения
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Настройка Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Перенаправление на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL сертификаты
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Безопасность
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Прокси на Node.js приложение
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Статические файлы
    location /uploads/ {
        alias /path/to/RecruitmentTracker/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6. Настройка SSL с Let's Encrypt

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автопродление
sudo crontab -e
# Добавить строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🐳 Docker развертывание

### 1. Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Копирование зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Создание пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 5000

CMD ["npm", "run", "start:prod"]
```

### 2. docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/recruit_pro
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=recruit_pro
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 3. Запуск

```bash
# Сборка и запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Применение миграций
docker-compose exec app npm run db:push
```

## 🔧 Мониторинг

### 1. PM2 мониторинг

```bash
# Статус процессов
pm2 status

# Мониторинг в реальном времени
pm2 monit

# Просмотр логов
pm2 logs

# Перезапуск
pm2 restart recruitment-tracker
```

### 2. Системные логи

```bash
# Просмотр логов Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Просмотр логов PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 🔄 Обновление

```bash
# Получение обновлений
git pull origin main

# Установка новых зависимостей
npm install

# Пересборка
npm run build

# Применение миграций
npm run db:push

# Перезапуск
pm2 restart recruitment-tracker
```

## 🚨 Безопасность

1. **Регулярно обновляйте зависимости**
   ```bash
   npm audit fix
   ```

2. **Настройте файрвол**
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

3. **Резервное копирование**
   ```bash
   # База данных
   pg_dump recruit_pro > backup_$(date +%Y%m%d).sql
   
   # Файлы
   tar -czf uploads_$(date +%Y%m%d).tar.gz uploads/
   ```

4. **Мониторинг ресурсов**
   ```bash
   # Использование диска
   df -h
   
   # Использование памяти
   free -h
   
   # Нагрузка на CPU
   top
   ```
