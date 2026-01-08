-- This schema combines models from Auth, Booking, Event, and Feedback services
-- into a single, monolithic PostgreSQL database schema.

-- ----------------------------
-- ENUM Types
-- ----------------------------

CREATE TYPE "Role" AS ENUM (
  'ADMIN',
  'USER',
  'SPEAKER'
);

CREATE TYPE "BookingStatus" AS ENUM (
  'CONFIRMED',
  'CANCELLED'
);

CREATE TYPE "TicketStatus" AS ENUM (
  'ISSUED',
  'SCANNED',
  'REVOKED',
  'EXPIRED'
);

CREATE TYPE "ScanMethod" AS ENUM (
  'QR_CODE',
  'MANUAL'
);

CREATE TYPE "EventStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'REJECTED',
  'PUBLISHED',
  'CANCELLED',
  'COMPLETED'
);

-- ----------------------------
-- Tables
-- ----------------------------

-- Table for Users (from Auth Service)
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "name" TEXT,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT, -- Optional for OAuth
  "image" TEXT,
  "emailVerified" TIMESTAMP(3),
  "role" "Role" NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table for Venues (from Event Service)
CREATE TABLE "venues" (
  "id" SERIAL PRIMARY KEY, -- Auto-incrementing integer
  "name" TEXT UNIQUE NOT NULL,
  "address" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "openingTime" TEXT NOT NULL, -- Stored as "HH:mm" string
  "closingTime" TEXT NOT NULL, -- Stored as "HH:mm" string
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table for OAuth Accounts (from Auth Service)
CREATE TABLE "accounts" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE ("provider", "providerAccountId"),
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Merged Table for Events (from Event and Booking Services)
CREATE TABLE "events" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "bannerImageUrl" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "rejectionReason" TEXT,
  "speakerId" TEXT NOT NULL,
  "venueId" INTEGER NOT NULL,
  "bookingStartDate" TIMESTAMP(3) NOT NULL,
  "bookingEndDate" TIMESTAMP(3) NOT NULL,

  -- Fields merged from Booking Service's Event model
  "capacity" INTEGER NOT NULL, -- Denormalized from Venue for booking logic
  "isActive" BOOLEAN NOT NULL DEFAULT true, -- Simplified status for booking logic

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("venueId") REFERENCES "venues"("id"),
  FOREIGN KEY ("speakerId") REFERENCES "users"("id") -- Assumed relation
);

-- Table for Bookings (from Booking Service)
CREATE TABLE "bookings" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE ("userId", "eventId"),
  FOREIGN KEY ("userId") REFERENCES "users"("id"),
  FOREIGN KEY ("eventId") REFERENCES "events"("id")
);

-- Table for Tickets (from Booking Service)
CREATE TABLE "tickets" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "bookingId" TEXT UNIQUE NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scannedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE
);

-- Table for QRCodes (from Booking Service)
CREATE TABLE "qr_codes" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "ticketId" TEXT UNIQUE NOT NULL,
  "data" TEXT UNIQUE NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'PNG',
  "scanCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE
);

-- Table for Attendance Records (from Booking Service)
CREATE TABLE "attendance_records" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "ticketId" TEXT NOT NULL,
  "scanTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scanLocation" TEXT,
  "scannedBy" TEXT,
  "scanMethod" "ScanMethod" NOT NULL DEFAULT 'QR_CODE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE
);

-- Table for Feedback Forms (from Feedback Service)
CREATE TABLE "feedback_forms" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "eventId" TEXT UNIQUE NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE
);

-- Table for Feedback Responses (from Feedback Service)
CREATE TABLE "feedback_responses" (
  "id" TEXT PRIMARY KEY, -- Application-generated CUID
  "formId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "bookingId" TEXT UNIQUE NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("formId") REFERENCES "feedback_forms"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users"("id"),
  FOREIGN KEY ("eventId") REFERENCES "events"("id"),
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
);

-- ----------------------------
-- Indexes
-- ----------------------------

-- Indexes from QRCode model
CREATE INDEX "qr_codes_data_idx" ON "qr_codes" ("data");

-- Indexes from AttendanceRecord model
CREATE INDEX "attendance_records_ticketId_idx" ON "attendance_records" ("ticketId");
CREATE INDEX "attendance_records_scanTime_idx" ON "attendance_records" ("scanTime");

-- Indexes from Event model
CREATE INDEX "events_speakerId_idx" ON "events" ("speakerId");
CREATE INDEX "events_venueId_idx" ON "events" ("venueId");
CREATE INDEX "events_status_idx" ON "events" ("status");

-- Indexes from FeedbackResponse model
CREATE INDEX "feedback_responses_formId_idx" ON "feedback_responses" ("formId");
CREATE INDEX "feedback_responses_userId_idx" ON "feedback_responses" ("userId");
CREATE INDEX "feedback_responses_eventId_idx" ON "feedback_responses" ("eventId");