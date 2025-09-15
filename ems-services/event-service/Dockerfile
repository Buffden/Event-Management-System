# Stage 1: Production dependencies
FROM node:lts-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY entrypoint.sh ./entrypoint.sh

# Install only production dependencies
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
COPY prisma/schema.prisma ./prisma/schema.prisma

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client
RUN npx prisma generate

# Copy only necessary files for building
COPY . .

# Build the application in production mode
RUN npm run build

FROM node:lts-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application with proper ownership
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

EXPOSE 3000

CMD ["sh", "-c", "if [ -d ./prisma ]; then npx prisma migrate dev --name $(date +%Y%m%d%H%M%S) && node dist/server.js; fi"]
