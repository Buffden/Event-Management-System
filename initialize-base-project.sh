#!/bin/bash
# A script to create the full project structure for the Event Management System,
# initializing the client (Next.js), gateway (NGINX), and all backend microservices (NestJS).

# Define the backend services to be created
services=(
  "auth-service"
  "user-service"
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
  npx create-next-app@latest ems-client --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

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

  echo "--> Creating Dockerfile for ems-client"
  cat <<EOF > "ems-client/Dockerfile"
# Stage 1: Production dependencies
FROM node:lts-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm ci
COPY . .
RUN npm run build

FROM node:lts-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
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

  # Declare service to path mapping
  service_paths=(
  "auth-service:/api/auth/"
  "user-service:/api/user/"
  "event-service:/api/event/"
  "registration-service:/api/registration/"
  "ticketing-service:/api/ticketing/"
  "speaker-service:/api/speaker/"
  "feedback-service:/api/feedback/"
  "notification-service:/api/notification/"
  "reporting-analytics-service:/api/reporting-analytics/"
  )

  # Build nginx.conf in one go
  {
    cat <<'NGINXHEAD'
# NGINX configuration for API Gateway
events {}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    error_log   /var/log/nginx/error.log warn;

    sendfile        on;
    keepalive_timeout  65;

    # Upstreams for backend services
    upstream ems-client {
        server ems-client:3000;
    }
NGINXHEAD

    # Upstreams
    for service in "${services[@]}"; do
        echo "    upstream $service {"
        echo "        server $service:3000;"
        echo "    }"
    done

    # Server block start
    cat <<'NGINXSERVER'

    server {
        listen 80;
        server_name localhost;

        # Health check
        location /health {
            access_log off;
            return 200 "gateway healthy\n";
            add_header Content-Type text/plain;
        }
NGINXSERVER

    # Service routes
    for entry in "${service_paths[@]}"; do
      service="${entry%%:*}"
      path="${entry#*:}"
      cat <<EOF

        # $service
        location $path {
            rewrite ^$path?(.*)$ /\$1 break;
            proxy_pass http://$service;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
EOF
    done

    # Close blocks
    cat <<'NGINXFOOT'

        # ems-client
        location / {
            proxy_pass http://ems-client;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINXFOOT

  } > "ems-gateway/nginx.conf"

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
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
EOF

  done
else
  echo "--> 'ems-services' directory is not empty. Skipping initialization."
fi


# --- 4. Create Dockerfile for NGINX gateway ---
echo ""
echo "--- Creating Dockerfile for NGINX gateway ---"
cat > "ems-gateway/Dockerfile" << 'GATEWAYEOF'
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
GATEWAYEOF

echo ""
echo "✅ Project scaffolding complete!"
