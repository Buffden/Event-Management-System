-- Reset enum in case a previous failed migration left it behind
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type t
        WHERE t.typname = 'SessionSpeakerMaterialsStatus'
    ) THEN
        DROP TYPE "SessionSpeakerMaterialsStatus";
    END IF;
END
$$;

-- CreateEnum
CREATE TYPE "SessionSpeakerMaterialsStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'ACKNOWLEDGED');

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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_event_id_starts_at_idx" ON "sessions"("event_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_speakers_session_id_speaker_id_key" ON "session_speakers"("session_id", "speaker_id");

-- CreateIndex
CREATE INDEX "session_speakers_speaker_id_idx" ON "session_speakers"("speaker_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

