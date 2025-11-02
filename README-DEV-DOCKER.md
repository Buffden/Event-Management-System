# Development Docker Setup with Hot-Reload

This document explains how to use the development Docker configuration that enables hot-reload for all services.

## Overview

The development Docker setup (`docker-compose.dev.yaml`) is configured to:
- Mount source code as volumes for immediate file change detection
- Run services in development mode with automatic reloading
- Use nodemon for backend services (TypeScript with hot-reload)
- Use Next.js dev mode for the client (with built-in hot-reload)

## Prerequisites

- Docker and Docker Compose installed
- All `.env.development` files are already created and configured for each service

The `.env.development` files are already present in the project and contain all necessary environment variables for development mode. They are automatically loaded when using `docker-compose.dev.yaml`.

If you need to modify any environment variables, edit the corresponding `.env.development` file in each service directory. See [ENV_SETUP.md](./ENV_SETUP.md) for details on what each variable does.

## Usage

### Starting All Services in Development Mode

```bash
docker-compose -f docker-compose.dev.yaml up
```

### Starting Services in Background

```bash
docker-compose -f docker-compose.dev.yaml up -d
```

### Stopping Services

```bash
docker-compose -f docker-compose.dev.yaml down
```

### Rebuilding Images (if Dockerfiles change)

```bash
docker-compose -f docker-compose.dev.yaml build
docker-compose -f docker-compose.dev.yaml up
```

### Viewing Logs

```bash
# All services
docker-compose -f docker-compose.dev.yaml logs -f

# Specific service
docker-compose -f docker-compose.dev.yaml logs -f auth-service-dev
```

## Service Ports

Services are exposed on the following ports (for direct access, bypassing gateway):

- **Client**: `http://localhost:3001`
- **Auth Service**: `http://localhost:3002`
- **Event Service**: `http://localhost:3003`
- **Booking Service**: `http://localhost:3004`
- **Feedback Service**: `http://localhost:3005`
- **Notification Service**: `http://localhost:3006`
- **Speaker Service**: `http://localhost:3007`
- **Gateway**: `http://localhost:80`
- **RabbitMQ Management**: `http://localhost:15672` (guest/guest)

## Hot-Reload Behavior

### Backend Services (Node.js/TypeScript)
- Uses **nodemon** to watch for file changes
- Automatically restarts when TypeScript files in `src/` are modified
- Prisma client is regenerated on container start
- File watching uses polling mode (compatible with macOS/Windows)

### Frontend (Next.js)
- Uses **Next.js dev mode** with built-in hot-reload
- Fast Refresh for React components
- Automatic compilation on file changes
- File watching uses polling mode

## Volume Mounts

The following directories are mounted as volumes (changes reflect immediately):
- Source code directories (`src/`, `app/`, etc.)
- Configuration files
- Prisma schemas

The following are excluded from mounts (use container's node_modules):
- `node_modules/` - Uses container's installed dependencies
- `dist/` - Build output (for backend services)
- `.next/` - Next.js build output (for client)

## Development vs Production

- **Development** (`docker-compose.dev.yaml`): Hot-reload enabled, all dependencies including dev deps
- **Production** (`docker-compose.yaml`): Optimized builds, production dependencies only

## Troubleshooting

### File Changes Not Detected

If file changes aren't being detected:
1. Ensure you're using `docker-compose.dev.yaml` (not the production file)
2. Check that volumes are properly mounted: `docker-compose -f docker-compose.dev.yaml ps`
3. On macOS/Windows, file watching uses polling - there may be a slight delay (1-2 seconds)

### Services Not Starting

1. Check logs: `docker-compose -f docker-compose.dev.yaml logs <service-name>`
2. Ensure databases are healthy: `docker-compose -f docker-compose.dev.yaml ps`
3. Verify `.env.production` files exist for all services

### Port Conflicts

If ports are already in use:
- Stop other services using those ports
- Or modify port mappings in `docker-compose.dev.yaml`

### Prisma Issues

If Prisma client generation fails:
- Ensure DATABASE_URL is set correctly
- Check that database containers are running and healthy
- Manually regenerate: `docker-compose -f docker-compose.dev.yaml exec auth-service-dev npx prisma generate`

## Environment Variables

The `docker-compose.dev.yaml` uses `.env.development` files for all environment variables. These files are automatically loaded based on which Docker Compose file you run:

- **Development**: `docker-compose.dev.yaml` → Uses `.env.development` files
- **Production**: `docker-compose.yaml` → Uses `.env.production` files

### Required Environment Variables

All environment variables should be defined in each service's `.env.development` file. See [ENV_SETUP.md](./ENV_SETUP.md) for complete documentation.

**Key Variables for Development:**

#### All Backend Services
- `DATABASE_URL` - Database connection URL (uses Docker service names)
- `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672` - RabbitMQ connection
- `GATEWAY_URL=http://ems-gateway` - Gateway URL for inter-service communication
- `JWT_SECRET` - JWT signing secret (**must be set**)
- `PORT=3000` - Service port
- `NODE_ENV=development` - Development mode

#### Client
- `NEXT_PUBLIC_API_BASE_URL=http://localhost/api` - API base URL for browser requests
- `NODE_ENV=development` - Development mode

#### Docker Compose Overrides
The `docker-compose.dev.yaml` only sets:
- `NODE_ENV=development` - Overrides .env file
- `CHOKIDAR_USEPOLLING=true` - File watching (macOS/Windows compatibility)
- `WATCHPACK_POLLING=true` - Next.js file watching

All other variables come from `.env.development` files.

## Notes

- The first startup may take longer as dependencies are installed
- Database migrations are not automatically run in dev mode - run manually if needed
- Development volumes are separate from production volumes (suffixed with `-dev`)
- Service-to-service communication uses Docker service names (e.g., `http://ems-gateway`)
- Client browser requests use `http://localhost/api` (routed through the gateway)
