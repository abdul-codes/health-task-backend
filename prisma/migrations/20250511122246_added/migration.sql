/*
  Warnings:

  - You are about to drop the column `tokenHash` on the `LoginToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHashSHA256]` on the table `LoginToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHashBcrypt` to the `LoginToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenHashSHA256` to the `LoginToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LoginToken_tokenHash_key";

-- AlterTable
ALTER TABLE "LoginToken" DROP COLUMN "tokenHash",
ADD COLUMN     "tokenHashBcrypt" TEXT NOT NULL,
ADD COLUMN     "tokenHashSHA256" TEXT NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHashSHA256_key" ON "LoginToken"("tokenHashSHA256");
