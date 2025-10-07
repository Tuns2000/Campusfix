# Руководство по развертыванию CampusFix

## Оглавление
1. [Требования к серверу](#требования-к-серверу)
2. [Подготовка окружения](#подготовка-окружения)
3. [Установка зависимостей](#установка-зависимостей)
4. [Настройка базы данных](#настройка-базы-данных)
5. [Конфигурация приложения](#конфигурация-приложения)
6. [Развертывание backend](#развертывание-backend)
7. [Развертывание frontend](#развертывание-frontend)
8. [Настройка Nginx](#настройка-nginx)
9. [Настройка SSL](#настройка-ssl)
10. [Мониторинг и логирование](#мониторинг-и-логирование)
11. [Резервное копирование](#резервное-копирование)
12. [Проверка работоспособности](#проверка-работоспособности)

---

## Требования к серверу

### Минимальные требования:
- **OS:** Ubuntu 20.04 LTS / Ubuntu 22.04 LTS или Windows Server 2019+
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disk:** 20 GB SSD
- **Network:** 100 Mbps

### Рекомендуемые требования:
- **OS:** Ubuntu 22.04 LTS
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Disk:** 50 GB SSD
- **Network:** 1 Gbps

### Необходимое ПО:
- Node.js 18.x или выше
- PostgreSQL 14.x или выше
- Nginx 1.18 или выше
- PM2 (для управления процессами)
- Git

---

## Подготовка окружения

### 1. Обновление системы (Ubuntu)

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Установка Node.js

```bash
# Добавление репозитория NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Установка Node.js
sudo apt install -y nodejs

# Проверка версии
node --version
npm --version
```

### 3. Установка PostgreSQL

```bash
# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка статуса
sudo systemctl status postgresql
```

### 4. Установка Nginx

```bash
# Установка Nginx
sudo apt install -y nginx

# Запуск Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверка статуса
sudo systemctl status nginx
```

### 5. Установка PM2

```bash
# Установка PM2 глобально
sudo npm install -g pm2

# Настройка автозапуска
pm2 startup systemd
```

### 6. Установка Git

```bash
sudo apt install -y git
```

---

## Установка зависимостей

### 1. Клонирование репозитория

```bash
# Создание директории для приложения
sudo mkdir -p /var/www/campusfix
sudo chown -R $USER:$USER /var/www/campusfix

# Клонирование
cd /var/www
git clone https://github.com/yourusername/campusfix.git
cd campusfix
```

### 2. Установка зависимостей backend

```bash
cd /var/www/campusfix/server
npm install --production
```

### 3. Установка зависимостей frontend

```bash
cd /var/www/campusfix/client
npm install
```

---

## Настройка базы данных

### 1. Создание пользователя PostgreSQL

```bash
sudo -u postgres psql

# В psql консоли:
CREATE USER campusfix_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE campusfix;
GRANT ALL PRIVILEGES ON DATABASE campusfix TO campusfix_user;

# Выход
\q
```

### 2. Применение миграций

```bash
cd /var/www/campusfix/server

# Применение схемы базы данных
sudo -u postgres psql -d campusfix -f sql/init.sql
```

### 3. Создание тестовых данных (опционально)

```bash
# Запуск скрипта seed
npm run db:seed
```

---

## Конфигурация приложения

### 1. Настройка backend (.env)

```bash
cd /var/www/campusfix/server
cp .env.example .env
nano .env
```

**Содержимое .env:**

```env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campusfix
DB_USER=campusfix_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_very_secure_random_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Сервер
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://your-domain.com

# Загрузка файлов
UPLOADS_DIR=uploads
MAX_FILE_SIZE=10485760

# Email (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
```

### 2. Настройка frontend

```bash
cd /var/www/campusfix/client
nano .env
```

**Содержимое .env:**

```env
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_NAME=CampusFix
```

### 3. Сборка frontend

```bash
cd /var/www/campusfix/client
npm run build
```

---

## Развертывание backend

### 1. Создание конфигурации PM2

```bash
cd /var/www/campusfix/server
nano ecosystem.config.js
```

**Содержимое ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'campusfix-server',
    script: './src/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### 2. Запуск приложения через PM2

```bash
cd /var/www/campusfix/server

# Создание директории для логов
mkdir -p logs

# Запуск приложения
pm2 start ecosystem.config.js

# Сохранение конфигурации
pm2 save

# Проверка статуса
pm2 status
pm2 logs campusfix-server
```

---

## Развертывание frontend

Frontend статические файлы будут обслуживаться через Nginx.

```bash
# Копирование собранных файлов
sudo mkdir -p /var/www/campusfix-client
sudo cp -r /var/www/campusfix/client/build/* /var/www/campusfix-client/
sudo chown -R www-data:www-data /var/www/campusfix-client
```

---

## Настройка Nginx

### 1. Создание конфигурации сайта

```bash
sudo nano /etc/nginx/sites-available/campusfix
```

**Содержимое файла:**

```nginx
# Backend API
upstream backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# Frontend
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    root /var/www/campusfix-client;
    index index.html;

    # Логи
    access_log /var/log/nginx/campusfix-access.log;
    error_log /var/log/nginx/campusfix-error.log;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend статика
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # API проксирование
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Загруженные файлы
    location /uploads/ {
        alias /var/www/campusfix/server/uploads/;
        add_header Cache-Control "public, max-age=31536000";
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;
}
```

### 2. Активация конфигурации

```bash
# Создание симлинка
sudo ln -s /etc/nginx/sites-available/campusfix /etc/nginx/sites-enabled/

# Удаление default конфигурации
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

---

## Настройка SSL (Let's Encrypt)

### 1. Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Получение сертификата

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Автоматическое обновление

```bash
# Проверка автообновления
sudo certbot renew --dry-run

# Автообновление настроится автоматически через systemd timer
```

### 4. Обновленная конфигурация Nginx с SSL

После запуска certbot файл `/etc/nginx/sites-available/campusfix` будет автоматически обновлен с настройками SSL.

---

## Настройка Firewall

```bash
# Установка UFW (если не установлен)
sudo apt install -y ufw

# Разрешение необходимых портов
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Включение firewall
sudo ufw enable

# Проверка статуса
sudo ufw status
```

---

## Мониторинг и логирование

### 1. PM2 мониторинг

```bash
# Просмотр логов
pm2 logs

# Мониторинг в реальном времени
pm2 monit

# Информация о процессах
pm2 info campusfix-server
```

### 2. Nginx логи

```bash
# Access log
sudo tail -f /var/log/nginx/campusfix-access.log

# Error log
sudo tail -f /var/log/nginx/campusfix-error.log
```

### 3. PostgreSQL логи

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 4. Настройка ротации логов

PM2 автоматически управляет ротацией логов. Для дополнительной настройки:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Резервное копирование

### 1. Скрипт резервного копирования БД

```bash
sudo nano /usr/local/bin/backup-campusfix-db.sh
```

**Содержимое скрипта:**

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/campusfix"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="campusfix"
DB_USER="campusfix_user"

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Создание бэкапа
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/campusfix_db_$DATE.sql.gz

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "campusfix_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/campusfix_db_$DATE.sql.gz"
```

```bash
# Установка прав
sudo chmod +x /usr/local/bin/backup-campusfix-db.sh

# Добавление в cron (ежедневно в 2:00)
sudo crontab -e

# Добавить строку:
0 2 * * * /usr/local/bin/backup-campusfix-db.sh >> /var/log/campusfix-backup.log 2>&1
```

### 2. Резервное копирование файлов

```bash
# Бэкап загруженных файлов
sudo tar -czf /var/backups/campusfix/uploads_$(date +"%Y%m%d").tar.gz -C /var/www/campusfix/server uploads/
```

---

## Проверка работоспособности

### 1. Проверка backend API

```bash
# Health check
curl http://localhost:5000/api/health

# Или через публичный домен
curl https://your-domain.com/api/health
```

### 2. Проверка базы данных

```bash
sudo -u postgres psql -d campusfix -c "SELECT COUNT(*) FROM users;"
```

### 3. Проверка frontend

Откройте в браузере: `https://your-domain.com`

### 4. Проверка PM2

```bash
pm2 status
pm2 logs campusfix-server --lines 50
```

### 5. Проверка Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

### 6. Мониторинг производительности

```bash
# Использование CPU и памяти
htop

# Дисковое пространство
df -h

# Сетевые соединения
netstat -tulpn | grep LISTEN
```

---

## Обновление приложения

### 1. Обновление backend

```bash
cd /var/www/campusfix
git pull origin main

cd server
npm install --production

# Применение миграций (если есть)
# psql -U campusfix_user -d campusfix -f sql/migrations/xxx.sql

# Перезапуск через PM2
pm2 restart campusfix-server
```

### 2. Обновление frontend

```bash
cd /var/www/campusfix/client
npm install
npm run build

# Копирование новых файлов
sudo rm -rf /var/www/campusfix-client/*
sudo cp -r build/* /var/www/campusfix-client/
sudo chown -R www-data:www-data /var/www/campusfix-client
```

---

## Устранение неполадок

### Backend не запускается

```bash
# Проверка логов
pm2 logs campusfix-server

# Проверка переменных окружения
pm2 env 0

# Перезапуск
pm2 restart campusfix-server
```

### База данных недоступна

```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Перезапуск PostgreSQL
sudo systemctl restart postgresql

# Проверка подключения
psql -U campusfix_user -d campusfix -h localhost
```

### Nginx ошибки

```bash
# Проверка конфигурации
sudo nginx -t

# Просмотр логов ошибок
sudo tail -f /var/log/nginx/campusfix-error.log

# Перезапуск
sudo systemctl restart nginx
```

### Проблемы с загрузкой файлов

```bash
# Проверка прав доступа
ls -la /var/www/campusfix/server/uploads/

# Установка правильных прав
sudo chown -R $USER:$USER /var/www/campusfix/server/uploads/
sudo chmod -R 755 /var/www/campusfix/server/uploads/
```

---

## Безопасность

### 1. Настройка fail2ban (защита от брутфорса)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Регулярные обновления

```bash
# Автоматические обновления безопасности
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Мониторинг безопасности

```bash
# Установка OSSEC или другой HIDS системы
# Настройка логирования неудачных попыток входа
# Регулярный аудит логов
```

---

## Контрольный чек-лист развертывания

- [ ] Сервер обновлен и настроен
- [ ] Node.js установлен
- [ ] PostgreSQL установлен и настроен
- [ ] База данных создана и мигрирована
- [ ] Nginx установлен и настроен
- [ ] PM2 установлен
- [ ] Backend зависимости установлены
- [ ] Frontend собран
- [ ] Переменные окружения настроены
- [ ] Backend запущен через PM2
- [ ] Frontend размещен в Nginx
- [ ] SSL сертификат настроен
- [ ] Firewall настроен
- [ ] Резервное копирование настроено
- [ ] Мониторинг настроен
- [ ] Проверка работоспособности выполнена
- [ ] Документация предоставлена
- [ ] Обучение пользователей проведено

---

## Контакты поддержки

При возникновении проблем обращайтесь:
- Email: support@campusfix.com
- Телефон: +7 (XXX) XXX-XX-XX
- Документация: https://docs.campusfix.com

---

**Версия документа:** 1.0.0  
**Дата:** 08.10.2025  
**Автор:** CampusFix Team
