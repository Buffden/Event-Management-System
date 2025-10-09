# Stage 1: Build
FROM alpine:latest AS builder
RUN apk update && apk add nodejs npm && rm -rf /var/cache/apk/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Runner
FROM alpine:latest AS runner
RUN apk update && apk add nodejs npm openssl && rm -rf /var/cache/apk/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install only prod deps in final image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

# Copy only what's needed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated


EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && node dist/server.js"]
