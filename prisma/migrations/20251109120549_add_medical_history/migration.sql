-- CreateEnum
CREATE TYPE "MedicalEventType" AS ENUM ('GENERAL', 'DIAGNOSIS', 'PRESCRIPTION', 'LAB_RESULT', 'VITAL_SIGNS', 'ALLERGY', 'SURGERY', 'VACCINATION', 'EMERGENCY', 'ADMISSION', 'DISCHARGE');

-- CreateEnum
CREATE TYPE "MedicalSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'XRAY', 'SCAN');

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eventType" "MedicalEventType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT,
    "severity" "MedicalSeverity" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalAttachment" (
    "id" TEXT NOT NULL,
    "medicalHistoryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "AttachmentType" NOT NULL DEFAULT 'DOCUMENT',
    "fileSize" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalHistory_patientId_idx" ON "MedicalHistory"("patientId");

-- CreateIndex
CREATE INDEX "MedicalHistory_date_idx" ON "MedicalHistory"("date");

-- CreateIndex
CREATE INDEX "MedicalHistory_eventType_idx" ON "MedicalHistory"("eventType");

-- CreateIndex
CREATE INDEX "MedicalAttachment_medicalHistoryId_idx" ON "MedicalAttachment"("medicalHistoryId");

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAttachment" ADD CONSTRAINT "MedicalAttachment_medicalHistoryId_fkey" FOREIGN KEY ("medicalHistoryId") REFERENCES "MedicalHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
