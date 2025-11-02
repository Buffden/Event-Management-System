# Environment Variables Setup Guide

This document explains how environment variables are dynamically loaded based on which Docker Compose file you use.

## Environment File Strategy

- **Development**: Uses `.env.development` files when running `docker-compose.dev.yaml`
- **Production**: Uses `.env.production` files when running `docker-compose.yaml`

## Environment Files

The `.env.development` files are already created in the project. This section documents their structure and contents:

### 1. Client: `ems-client/.env.development`

```bash
# API Configuration
# For browser requests, use localhost to access the gateway
NEXT_PUBLIC_API_BASE_URL=http://localhost/api

# Environment
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

### 2. Auth Service: `ems-services/auth-service/.env.development`

```bash
# Database Configuration
DATABASE_URL=postgresql://admin:password@auth-service-db:5432/auth_db

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Server Configuration
PORT=3000
NODE_ENV=development

# Gateway URL for inter-service communication
GATEWAY_URL=http://ems-gateway
```

### 3. Event Service: `ems-services/event-service/.env.development`

```bash
# Database Configuration
DATABASE_URL=postgresql://admin:password@event-service-db:5432/event_db

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Server Configuration
PORT=3000
NODE_ENV=development

# Gateway URL for inter-service communication
GATEWAY_URL=http://ems-gateway
```

### 4. Booking Service: `ems-services/booking-service/.env.development`

```bash
# Database Configuration
DATABASE_URL=postgresql://admin:password@booking-service-db:5432/booking_db

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Server Configuration
PORT=3000
NODE_ENV=development

# Gateway URL for inter-service communication
GATEWAY_URL=http://ems-gateway
```

### 5. Feedback Service: `ems-services/feedback-service/.env.development`

```bash
# Database Configuration
DATABASE_URL=postgresql://admin:password@feedback-service-db:5432/feedback_db

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration (optional)
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Server Configuration
PORT=3000
NODE_ENV=development

# Gateway URL for inter-service communication
GATEWAY_URL=http://ems-gateway
```

### 6. Notification Service: `ems-services/notification-service/.env.development`

```bash
# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Server Configuration
PORT=3000
NODE_ENV=development

# Gateway URL for inter-service communication
GATEWAY_URL=http://ems-gateway
```

### 7. Speaker Service: `ems-services/speaker-service/.env.development`

```bash
# Database Configuration
DATABASE_URL=postgresql://admin:password@speaker-service-db:5432/speaker_db

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Server Configuration
PORT=3000
NODE_ENV=development

# Gateway URL for inter-service communication
GATEWAY_URL=http://ems-gateway
```

## Modifying Environment Variables

To modify environment variables for development:

1. Edit the corresponding `.env.development` file in each service directory
2. Restart the service: `docker-compose -f docker-compose.dev.yaml restart <service-name>`

For production, edit the `.env.production` files instead.

## Key Differences: Development vs Production

### Development (`.env.development`)
- Uses Docker service names for inter-service communication (e.g., `http://ems-gateway`)
- Client uses `http://localhost/api` for browser requests
- Database URLs use Docker container names (e.g., `auth-service-db`)
- RabbitMQ URL uses Docker service name (`rabbitmq`)
- `NODE_ENV=development`

### Production (`.env.production`)
- May use external URLs or load balancer endpoints
- Client API URL points to production domain
- Database URLs use production database hosts
- RabbitMQ URL uses production RabbitMQ host
- `NODE_ENV=production`

## Important Notes

1. **File Priority**: Docker Compose `env_file` loads variables first, then `environment` section overrides them. In our setup:
   - `env_file` loads from `.env.development` or `.env.production`
   - `environment` section only sets `NODE_ENV` and file watching options

2. **JWT_SECRET**: **Must be changed** in production! Use a strong, random secret.

3. **Database URLs**: Development uses Docker container names. Production should use actual database server addresses.

4. **Client API URL**:
   - Development: `http://localhost/api` (browser access via host)
   - Production: Your production API URL (e.g., `https://api.yourdomain.com/api`)

5. **Service-to-Service Communication**: All services use `GATEWAY_URL=http://ems-gateway` to communicate via the gateway in Docker network.

## Verification

To verify all `.env.development` files exist:

```bash
find . -name ".env.development" -type f
```

You should see 7 files:
- `ems-client/.env.development`
- `ems-services/auth-service/.env.development`
- `ems-services/event-service/.env.development`
- `ems-services/booking-service/.env.development`
- `ems-services/feedback-service/.env.development`
- `ems-services/notification-service/.env.development`
- `ems-services/speaker-service/.env.development`

## Troubleshooting

### Environment variables not loading
1. Check file name: Must be exactly `.env.development` (not `.env.development.local` or similar)
2. Check file location: Must be in the service's root directory
3. Verify Docker Compose is reading the file: Check logs for environment variable values

### API calls going to wrong URL
1. Verify `NEXT_PUBLIC_API_BASE_URL` in `ems-client/.env.development`
2. Restart the client container after changing `.env.development`
3. Clear Next.js cache if needed: `docker-compose -f docker-compose.dev.yaml restart ems-client`

### Services can't connect to each other
1. Verify `GATEWAY_URL=http://ems-gateway` in all service `.env.development` files
2. Check that services are on the same Docker network (`event-net`)
3. Verify RabbitMQ URL uses Docker service name: `amqp://guest:guest@rabbitmq:5672`

