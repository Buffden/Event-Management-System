-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'SCANNED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScanMethod" AS ENUM ('QR_CODE', 'MANUAL');

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PNG',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "scanTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanLocation" TEXT,
    "scannedBy" TEXT,
    "scanMethod" "ScanMethod" NOT NULL DEFAULT 'QR_CODE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_bookingId_key" ON "tickets"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_ticketId_key" ON "qr_codes"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_data_key" ON "qr_codes"("data");

-- CreateIndex
CREATE INDEX "qr_codes_data_idx" ON "qr_codes"("data");

-- CreateIndex
CREATE INDEX "attendance_records_ticketId_idx" ON "attendance_records"("ticketId");

-- CreateIndex
CREATE INDEX "attendance_records_scanTime_idx" ON "attendance_records"("scanTime");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
