/*
  Warnings:

  - A unique constraint covering the columns `[expoPushToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_expoPushToken_key" ON "User"("expoPushToken");
