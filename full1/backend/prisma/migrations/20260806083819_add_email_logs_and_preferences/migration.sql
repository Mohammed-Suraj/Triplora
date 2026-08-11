-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WELCOME', 'VERIFICATION', 'FORGOT_PASSWORD', 'PASSWORD_RESET', 'BOOKING_CONFIRMATION', 'PAYMENT_SUCCESS', 'BOOKING_CANCELLED', 'AI_TRIP_SAVED', 'TRIP_REMINDER');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aiPlannerEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketingEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tripReminderEmails" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_type_idx" ON "email_logs"("type");

-- CreateIndex
CREATE INDEX "email_logs_to_idx" ON "email_logs"("to");
