# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Создаем директории для логов и загрузок
RUN mkdir -p logs uploads

# Устанавливаем права доступа
RUN chown -R node:node /app

# Переключаемся на непривилегированного пользователя
USER node

# Открываем порт
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Запускаем приложение
CMD ["node", "src/index.js"]
