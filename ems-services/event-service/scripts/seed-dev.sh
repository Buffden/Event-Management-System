#!/bin/bash

# Development seeding script
# This script runs the seeder for local development

echo "🌱 Running venue seeder for development..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with DATABASE_URL"
    exit 1
fi

# Run the seeder
npm run prisma:seed

echo "✅ Seeding completed!"
