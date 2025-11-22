-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'REJECTED', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionSpeakerMaterialsStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "venues" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "openingTime" TEXT NOT NULL,
    "closingTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "stage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_speakers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "speaker_id" TEXT NOT NULL,
    "materials_asset_id" TEXT,
    "materials_status" "SessionSpeakerMaterialsStatus" NOT NULL DEFAULT 'REQUESTED',
    "speaker_checkin_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "special_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");

-- CreateIndex
CREATE INDEX "events_speakerId_idx" ON "events"("speakerId");

-- CreateIndex
CREATE INDEX "events_venueId_idx" ON "events"("venueId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "sessions_event_id_starts_at_idx" ON "sessions"("event_id", "starts_at");

-- CreateIndex
CREATE INDEX "session_speakers_speaker_id_idx" ON "session_speakers"("speaker_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_speakers_session_id_speaker_id_key" ON "session_speakers"("session_id", "speaker_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
