# ── deps stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY src ./src

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000
ENV NODE_ENV=production

# Runs migrations then starts the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
