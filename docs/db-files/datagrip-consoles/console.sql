-- -----------------------------------------------------
-- Global ENUM Types
-- These types can be shared across different services.
-- -----------------------------------------------------
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'SPEAKER');

CREATE TYPE event_status AS ENUM (
  'PENDING_APPROVAL',
  'APPROVED',
  'DECLINED',
  'PUBLISHED',
  'CANCELLED'
);

CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TYPE cancellation_type AS ENUM ('DECLINED', 'CANCELLED');


-- -----------------------------------------------------
-- Service: Auth Service
-- Responsibilities: Manages user identity, authentication, and roles.
-- -----------------------------------------------------
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  image TEXT,
  email_verified TIMESTAMPTZ,
  role user_role NOT NULL DEFAULT 'USER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  -- This foreign key is KEPT as it's within the same service boundary.
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  UNIQUE (provider, provider_account_id)
);


-- -----------------------------------------------------
-- Service: Speaker Service
-- Responsibilities: Manages detailed speaker profiles and their uploaded materials.
-- -----------------------------------------------------
CREATE TABLE speaker_profiles (
  -- The PK is also the user_id from the Auth service.
  user_id TEXT PRIMARY KEY,
  bio TEXT,
  social_links JSONB
  -- Foreign key to users table is REMOVED for decoupling.
);

CREATE TABLE materials (
    id TEXT PRIMARY KEY,
    -- Foreign key to Speaker Service's speaker_profiles table is KEPT.
    speaker_user_id TEXT NOT NULL REFERENCES speaker_profiles(user_id) ON DELETE CASCADE,
    -- ID from the Schedule Service's sessions table.
    session_id TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL
    -- Foreign key to sessions table is REMOVED for decoupling.
);


-- -----------------------------------------------------
-- Service: Event Service
-- Responsibilities: The source of truth for event details, venues, categories, and status.
-- -----------------------------------------------------
CREATE TABLE venues (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  capacity INT
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status event_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  -- Foreign keys to venues and categories are KEPT as they are within the same service.
  venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  -- ID from the Auth Service's users table.
  requested_by_user_id TEXT NOT NULL,
  -- ID from the Auth Service's users table.
  reviewed_by_user_id TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Foreign keys to users table are REMOVED for decoupling.
);

CREATE TABLE cancellations (
    id TEXT PRIMARY KEY,
    -- Foreign key to Event Service's events table is KEPT.
    event_id TEXT UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    cancellation_type cancellation_type NOT NULL,
    reason TEXT NOT NULL,
    -- ID from the Auth Service's users table.
    processed_by_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Foreign key to users table is REMOVED for decoupling.
);


-- -----------------------------------------------------
-- Service: Schedule Service
-- Responsibilities: Manages the detailed agenda, including sessions and speaker assignments.
-- -----------------------------------------------------
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  -- ID from the Event Service's events table.
  event_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location VARCHAR(255)
  -- Foreign key to events table is REMOVED for decoupling.
);

CREATE TABLE session_speakers (
  -- Foreign key to Schedule Service's sessions table is KEPT.
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  -- ID from the Speaker Service's speaker_profiles table.
  speaker_user_id TEXT NOT NULL,
  PRIMARY KEY (session_id, speaker_user_id)
  -- Foreign key to speaker_profiles table is REMOVED for decoupling.
);


-- -----------------------------------------------------
-- Service: Booking Service
-- Responsibilities: Manages the relationship between attendees and events.
-- -----------------------------------------------------
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  -- ID from the Auth Service's users table.
  user_id TEXT NOT NULL,
  -- ID from the Event Service's events table.
  event_id TEXT NOT NULL,
  status booking_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
  -- Foreign keys to users and events tables are REMOVED for decoupling.
);


-- -----------------------------------------------------
-- Service: Ticket Service
-- Responsibilities: Generates and validates tickets after a successful booking.
-- -----------------------------------------------------
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  -- ID from the Booking Service's bookings table.
  booking_id TEXT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Foreign key to bookings table is REMOVED for decoupling.
);


-- -----------------------------------------------------
-- Service: Feedback Service
-- Responsibilities: Collects and stores feedback from attendees.
-- -----------------------------------------------------
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  -- ID from the Auth Service's users table.
  user_id TEXT NOT NULL,
  -- ID from the Event Service's events table.
  event_id TEXT NOT NULL,
  -- ID from the Schedule Service's sessions table. Nullable.
  session_id TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Foreign keys to users, events, and sessions tables are REMOVED for decoupling.
);



-- -----------------------------------------------------
-- Delete all tables and types (for resetting the schema)
-- -----------------------------------------------------
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

SELECT t.typname AS enum_name, n.nspname AS schema_name
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typtype = 'e'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND t.typname NOT LIKE 'pg_%';

DROP TYPE IF EXISTS user_role, event_status, booking_status, cancellation_type CASCADE;