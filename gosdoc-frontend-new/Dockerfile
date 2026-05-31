# ============================================================
# ГосДок — Frontend (React/Vite) → Caddy (HTTPS + reverse proxy)
# Multi-stage: собираем SPA в Node, отдаём статикой через Caddy.
# ============================================================

# ---- Stage 1: сборка ----
FROM node:20-alpine AS build
WORKDIR /app

# Зависимости (кэш слоя)
COPY package.json package-lock.json ./
RUN npm ci

# Исходники
COPY . .

# Vite инлайнит VITE_*-переменные на этапе сборки. Передаём Client ID как build-arg,
# чтобы кнопка Google работала и без файла .env в контексте сборки.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ---- Stage 2: отдача через Caddy ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/dist
EXPOSE 80 443
