ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTACT_REQUEST';

CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'ACCEPTED');

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "addresseeId" TEXT NOT NULL,
  "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contact_requesterId_addresseeId_key" ON "Contact"("requesterId", "addresseeId");
CREATE INDEX "Contact_addresseeId_status_idx" ON "Contact"("addresseeId", "status");
CREATE INDEX "Contact_requesterId_status_idx" ON "Contact"("requesterId", "status");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
