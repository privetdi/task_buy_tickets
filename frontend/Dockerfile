# --- Сборка статики ---
FROM node:24-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: скрипты установки зависимостей не нужны для сборки и не должны выполняться
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# --- Раздача статики и проксирование /api на бэкенд ---
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
