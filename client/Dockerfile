# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --silent

# Копируем исходный код
COPY . .

# Аргументы сборки
ARG REACT_APP_API_URL=http://localhost:5000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Собираем приложение
RUN npm run build

# Production stage
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=build /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx (если есть)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
