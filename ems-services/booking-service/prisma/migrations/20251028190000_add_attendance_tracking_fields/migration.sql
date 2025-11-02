-- Add attendance tracking fields to bookings table
ALTER TABLE "bookings" ADD COLUMN "joinedAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "isAttended" BOOLEAN NOT NULL DEFAULT false;

-- Add index for attendance queries
CREATE INDEX "bookings_joinedAt_idx" ON "bookings"("joinedAt");
CREATE INDEX "bookings_isAttended_idx" ON "bookings"("isAttended");
