# Stage 1: Build
FROM alpine:latest AS builder
RUN apk update && apk add nodejs npm && rm -rf /var/cache/apk/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runner
FROM alpine:latest AS runner
RUN apk update && apk add nodejs npm && rm -rf /var/cache/apk/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install only prod deps in final image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

# Copy only what's needed
COPY --from=builder /app/dist ./dist


EXPOSE 3000

CMD ["sh", "-c", "sleep 30 && node dist/server.js"]
