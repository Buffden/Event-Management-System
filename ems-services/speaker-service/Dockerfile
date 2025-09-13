# ---- Dependencies Stage ----
FROM node:lts-alpine AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build Stage ----
FROM node:lts-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:lts-alpine AS production
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
