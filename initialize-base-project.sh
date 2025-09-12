#!/bin/bash
# A script to create the full project structure for the Event Management System,
# initializing the client (Next.js), gateway (NGINX), and all backend microservices (NestJS).

# Define the backend services to be created
services=(
  "auth-service"
  "event-service"
  "registration-service"
  "ticketing-service"
  "speaker-service"
  "feedback-service"
  "notification-service"
  "reporting-analytics-service"
)

# --- Create Project Directories ---
echo "--- Creating root directories: ems-client, ems-services, ems-gateway ---"
mkdir -p ems-client
mkdir -p ems-services
mkdir -p ems-gateway

# --- 1. Initialize Frontend (Next.js) ---
echo ""
echo "--- Setting up Frontend: ems-client ---"
if [ -z "$(ls -A ems-client)" ]; then
  echo "--> 'ems-client' is empty. Initializing Next.js project..."
  # Use create-next-app with non-interactive flags for a modern setup
  npx create-next-app@latest ems-client --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

  # --- Create .dockerignore for Next.js client ---
  echo "--> Creating .dockerignore for ems-client"
  cat <<EOF > "ems-client/.dockerignore"
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

.DS_Store
node_modules
.next
.swc
*.log
EOF

  # --- Create Dockerfile for Next.js client ---
  echo "--> Creating Dockerfile for ems-client"
  cat <<EOF > "ems-client/Dockerfile"
# Stage 1: Production dependencies
FROM node:lts-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./

# Set production environment
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
RUN npm ci

# Copy only necessary files for building
COPY . .

# Build the application in production mode
RUN npm run build

FROM node:lts-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Use CMD instead of ENTRYPOINT for better container orchestration
CMD ["node", "server.js"]
EOF

else
  echo "--> 'ems-client' directory is not empty. Skipping initialization."
fi


# --- 2. Initialize Gateway (NGINX) ---
echo ""
echo "--- Setting up API Gateway: ems-gateway ---"
if [ -z "$(ls -A ems-gateway)" ]; then
  echo "--> 'ems-gateway' is empty. Creating NGINX configuration..."
  # Create a default nginx.conf file for reverse proxying
  cat <<EOF > "ems-gateway/nginx.conf"
# Basic NGINX configuration for API Gateway
# Forwards requests to the appropriate microservice based on the URL path.

events {}

http {
    server {
        listen 80;

        # Route to frontend client (if running in Docker)
        location / {
            proxy_pass http://ems-client:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }

        # API routing for backend services
$(for service in "${services[@]}"; do
  # Extract the base name for the URL path (e.g., auth-service -> auth)
  path_name=$(echo "$service" | sed 's/-service//')
  echo "        location /api/$path_name/ {"
  echo "            proxy_pass http://$service:3000/;"
  echo "        }"
done)
    }
}
EOF
else
  echo "--> 'ems-gateway' directory is not empty. Skipping initialization."
fi


# --- 3. Initialize Backend Microservices (NestJS) ---
echo ""
echo "--- Setting up Backend: ems-services ---"
if ! command -v nest &> /dev/null
then
    echo "--> NestJS CLI not found. Installing globally via npm..."
    npm install -g @nestjs/cli
fi

if [ -z "$(ls -A ems-services)" ]; then
  echo "--> 'ems-services' is empty. Initializing NestJS microservices..."
  for service in "${services[@]}"; do
    service_path="ems-services/$service"
    echo "--> Creating and initializing: $service"
    nest new "$service_path" --package-manager npm --skip-git

    # Create .dockerignore for the service
    echo "--> Creating .dockerignore for $service"
    cat <<EOF > "$service_path/.dockerignore"
.git
.github
node_modules
dist
.env
Dockerfile
.dockerignore
EOF

    # Create Dockerfile for the service
    echo "--> Creating Dockerfile for $service"
    cat <<EOF > "$service_path/Dockerfile"
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

# Copy only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built app
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
EOF

  done
else
  echo "--> 'ems-services' directory is not empty. Skipping initialization."
fi

echo ""
echo "✅ Project scaffolding complete!"