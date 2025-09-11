# Stage 1: Production dependencies
FROM node:20-alpine3.22 AS builder
WORKDIR /app
COPY package.json package-lock.json ./

# Set production environment
ENV NEXT_TELEMETRY_DISABLED=1

# Install only production dependencies
RUN npm ci

# Copy only necessary files for building
COPY . .

# Build the application in production mode
RUN npm run build

FROM node:20-alpine3.22 AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application with proper ownership
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Use CMD instead of ENTRYPOINT for better container orchestration
CMD ["node", "server.js"]
