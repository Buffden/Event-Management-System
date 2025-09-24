# Stage 1: Build
FROM node:lts-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runner
FROM node:lts-slim AS runner
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
