-- CreateTable
CREATE TABLE "feedback_forms" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_responses" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_forms_eventId_key" ON "feedback_forms"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_responses_bookingId_key" ON "feedback_responses"("bookingId");

-- CreateIndex
CREATE INDEX "feedback_responses_formId_idx" ON "feedback_responses"("formId");

-- CreateIndex
CREATE INDEX "feedback_responses_userId_idx" ON "feedback_responses"("userId");

-- CreateIndex
CREATE INDEX "feedback_responses_eventId_idx" ON "feedback_responses"("eventId");

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_formId_fkey" FOREIGN KEY ("formId") REFERENCES "feedback_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
