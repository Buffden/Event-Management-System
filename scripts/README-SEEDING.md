# Event Management System - Complete Seeding Script

This directory contains a comprehensive seeding script for the Event Management System that creates users, speakers, events, and bookings.

## Overview

The seeding process ensures that:
- ✅ Users and speakers are created via HTTP API (triggers all service integrations)
- ✅ Speaker profiles are created automatically via RabbitMQ (when speakers register)
- ✅ Users are activated via admin API (emailVerified and isActive set)
- ✅ Events are created by admin and assigned to speakers
- ✅ Events respect venue operating hours
- ✅ Users register for events (bookings created)
- ✅ Admin users are seeded separately via auth-service prisma seed script (seed.ts)

## Files

1. **`seed.py`** - Main seeding script (Python, modular structure)
2. **`modules/`** - Modular components:
   - `utils.py` - Shared utilities (colors, config, API URLs)
   - `user_seeding.py` - User and speaker registration
   - `event_seeding.py` - Event creation by admin
   - `booking_seeding.py` - User registrations for events
3. **`requirements.txt`** - Python dependencies

## Prerequisites

1. **Admin User**: An admin user must exist before running the script. Seed it via:
   ```bash
   cd ems-services/auth-service
   npx prisma db seed
   ```
   Default admin credentials:
   - Email: `admin@eventmanagement.com`
   - Password: `Admin123!`

2. **Venues**: Venues should be seeded first. Run:
   ```bash
   cd ems-services/event-service
   npx prisma db seed
   ```

3. **Services Running**: Ensure all services are running:
   - auth-service
   - event-service
   - booking-service
   - speaker-service
   - RabbitMQ

## Installation

```bash
# Install dependencies
cd scripts
pip install -r requirements.txt

# Or install manually:
pip install requests faker
```

## Usage

### Basic Usage

```bash
# From project root
python3 scripts/seed.py

# Or from scripts directory
cd scripts
python3 seed.py
```

### Custom Configuration

You can override default URLs via environment variables:

```bash
# Custom API URLs
AUTH_API_URL=http://localhost:3000/api/auth \
EVENT_API_URL=http://localhost:3000/api/event \
BOOKING_API_URL=http://localhost:3000/api/booking \
python3 scripts/seed.py

# Custom admin credentials
ADMIN_EMAIL=your-admin@example.com \
ADMIN_PASSWORD=YourPassword123! \
python3 scripts/seed.py
```

### Full Example

```bash
AUTH_API_URL=http://localhost/api/auth \
EVENT_API_URL=http://localhost/api/event \
BOOKING_API_URL=http://localhost/api/booking \
ADMIN_EMAIL=admin@eventmanagement.com \
ADMIN_PASSWORD=Admin123! \
python3 scripts/seed.py
```

## What Gets Created

### Step 1-2: Speakers and Users
- **5 Speakers**: speaker1@test.com through speaker5@test.com
  - **Password**: Speaker1123! through Speaker5123!
  - **Profile**: Created automatically via RabbitMQ
- **10 Regular Users**: user1@test.com through user10@test.com
  - **Password**: User1123! through User10123!

### Step 3: RabbitMQ Processing
- Waits 5 seconds for RabbitMQ to process speaker profile creation

### Step 4: User Activation
- All users are activated via admin API
- `emailVerified` set to current date
- `isActive` set to `true`
- Users can login immediately without email verification

### Step 5: Events (8 events created)
- Created by admin and assigned to random speakers
- Events are **auto-published** (PUBLISHED status) when created by admin
- Events respect venue operating hours (openingTime/closingTime)
- Event durations:
  - Same-day events: 2-8 hours
  - Multi-day events: 1-3 days
- Event names generated using Faker library (creative names)
- Categories: Technology, Business, Education, Arts & Culture, Health & Wellness, Science, Entertainment, Networking

### Step 6: Bookings
- Each user randomly registers for 1-4 events
- Only published events are used
- Bookings created via booking-service API

## Script Flow

```
1. Admin Login Verification
   ↓
2. Register Speakers (5)
   ↓
3. Register Users (10)
   ↓
4. Wait for RabbitMQ (5 seconds)
   ↓
5. Activate Users (via admin API)
   ↓
6. Create Events (8 events, assigned to speakers)
   ↓
7. Create Bookings (users register for events)
```

## Important Notes

1. **Admin Credentials**:
   - Default: `admin@eventmanagement.com` / `Admin123!`
   - Can be overridden via `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars
   - Admin must exist before running script

2. **Speaker Profiles**:
   - Created automatically via RabbitMQ when speakers register
   - May take 5-10 seconds after registration
   - Script waits for RabbitMQ processing

3. **Event Creation**:
   - Admin creates events with speaker's `userId` to assign them
   - Events auto-publish when created by admin
   - Venue times are validated (events must fit within venue hours)

4. **User Activation**:
   - All users are activated via protected admin API endpoint
   - No need for email verification after seeding
   - Users can login immediately

5. **Password Format**:
   - Pattern: `[Role][Number]123!`
   - Examples: `Speaker1123!`, `User5123!`

## Troubleshooting

### Admin Login Fails
- Verify admin user exists: `cd ems-services/auth-service && npx prisma db seed`
- Check credentials match default or override via env vars
- Ensure auth-service is running

### 502 Bad Gateway Errors
- Auth-service may not be running
- Check: `docker ps | grep auth-service`
- Check logs: `docker logs auth-service`
- Start service: `docker-compose up -d auth-service`

### No Venues Available
- Seed venues first: `cd ems-services/event-service && npx prisma db seed`
- Verify venues exist via: `GET /api/event/venues/all`

### Events Not Created
- Check event-service is running
- Verify venues exist
- Check admin token is valid
- Review event-service logs

### Bookings Not Created
- Ensure events are PUBLISHED status
- Verify users can login (check activation)
- Check booking-service is running
- Review booking-service logs

### Speaker Profiles Not Created
- Verify RabbitMQ is running
- Check speaker-service logs for RabbitMQ connection
- Wait longer (RabbitMQ may need more time)
- Manually create via `POST /api/speakers`

## API Endpoints Used

- `POST /api/auth/register` - Register users and speakers
- `POST /api/auth/login` - Admin authentication
- `POST /api/auth/admin/activate-users` - Activate users (admin only)
- `GET /api/event/venues/all` - Fetch available venues
- `POST /api/event/events` - Create events (as admin)
- `POST /api/booking/bookings` - Create bookings (user registrations)

## Verification

After running the seeding script, verify the data:

```bash
# Check users were created
curl http://localhost/api/auth/check-user?email=speaker1@test.com

# Check events (requires authentication)
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost/api/event/admin/events

# Check bookings (requires authentication)
curl -H "Authorization: Bearer <user_token>" \
  http://localhost/api/booking/bookings/my-bookings
```

## Next Steps

After seeding:
1. ✅ Verify users can login
2. ✅ Check speaker profiles were created
3. ✅ Verify events are published and assigned to speakers
4. ✅ Check users have bookings/registrations
5. ✅ Test the system with seeded data

## Module Structure

The script is modular for maintainability:

- **`seed.py`** - Main orchestrator
- **`modules/utils.py`** - Shared utilities (colors, config)
- **`modules/user_seeding.py`** - User/speaker registration logic
- **`modules/event_seeding.py`** - Event creation with venue validation
- **`modules/booking_seeding.py`** - User registration for events

Each module can be tested independently or modified without affecting others.
