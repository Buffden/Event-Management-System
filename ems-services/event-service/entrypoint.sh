#!/bin/sh
# entrypoint.sh

# Abort on any error
#set -e

echo "Running database migrations..."

npx prisma migrate dev --name event-service-migration-$(date +%Y%m%d%H%M%S)

echo "Migrations finished successfully."

exec "$@"