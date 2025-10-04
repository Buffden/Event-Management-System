# Event Service Database Seeder

This directory contains the database seeding functionality for the Event Management System.

## Files

- `seed.js` - Production seeder (JavaScript)
- `seed.ts` - Development seeder (TypeScript)
- `schema.prisma` - Database schema definition

## Usage

### Production/Docker
The seeder runs automatically when the event-service container starts:
```bash
docker-compose up event-service
```

### Local Development

#### Option 1: Using npm script
```bash
npm run prisma:seed
```

#### Option 2: Using development script
```bash
./scripts/seed-dev.sh
```

#### Option 3: Using TypeScript version (requires ts-node)
```bash
npm run prisma:seed:dev
```

## What Gets Seeded

The seeder creates 10 sample venues with realistic data:

1. **Grand Conference Center** (500 capacity)
2. **Tech Innovation Hub** (200 capacity)
3. **Community Hall** (150 capacity)
4. **University Auditorium** (800 capacity)
5. **Business Center** (300 capacity)
6. **Cultural Arts Center** (250 capacity)
7. **Sports Complex** (1000 capacity)
8. **Hotel Conference Room** (100 capacity)
9. **Library Meeting Room** (75 capacity)
10. **Exhibition Center** (2000 capacity)

## Features

- ✅ **Duplicate Prevention**: Won't re-seed if venues already exist
- ✅ **Error Handling**: Proper error handling and logging
- ✅ **Docker Integration**: Automatically runs when database is ready
- ✅ **Development Support**: Easy local development seeding
- ✅ **Realistic Data**: Diverse, realistic venue data

## Prerequisites

- Database must be running and accessible
- Prisma client must be generated (`npm run prisma:generate`)
- Database migrations must be applied (`npm run prisma:migrate`)

## Environment Variables

Make sure your `.env` file contains the correct `DATABASE_URL`:

```env
DATABASE_URL="postgresql://admin:password@localhost:5433/event_db"
```

## Troubleshooting

### "ts-node: not found" error
Use the JavaScript version instead:
```bash
npm run prisma:seed
```

### "Can't reach database server" error
- Ensure your database is running
- Check your `DATABASE_URL` in `.env`
- Verify database connection settings
