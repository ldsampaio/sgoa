# ---- Stage 1: build do frontend (SPA) ----
FROM node:22-alpine AS web
WORKDIR /web
COPY dev/frontend/package*.json ./
RUN npm ci
COPY dev/frontend ./
RUN npm run build

# ---- Stage 2: backend + frontend buildado (container único) ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY dev/backend/package*.json ./
RUN npm ci --omit=dev

COPY dev/backend/server.js ./
COPY dev/backend/criptografar-smtp.js ./
COPY dev/backend/src ./src
COPY dev/backend/scripts ./scripts
COPY --from=web /web/dist ./public

# Uploads e (se SQLite) banco vivem em volumes — nunca na imagem.
VOLUME ["/app/uploads"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
