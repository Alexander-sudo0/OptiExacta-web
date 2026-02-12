/*
  Warnings:

  - The primary key for the `FaceSearchRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `label` on the `FaceSearchRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestPayload` on the `FaceSearchRequest` table. All the data in the column will be lost.
  - You are about to drop the column `responsePayload` on the `FaceSearchRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FaceSearchRequest` table. All the data in the column will be lost.
  - The primary key for the `ShareToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `requestId` on the `ShareToken` table. All the data in the column will be lost.
  - You are about to drop the column `sharedByEmail` on the `ShareToken` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `FaceSearchRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestData` to the `FaceSearchRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resultData` to the `FaceSearchRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apiType` to the `ShareToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `faceSearchRequestId` to the `ShareToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ShareToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ShareToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TenantRole" ADD VALUE 'VIEWER';

-- DropForeignKey
ALTER TABLE "ShareToken" DROP CONSTRAINT "ShareToken_requestId_fkey";

-- DropIndex
DROP INDEX "FaceSearchRequest_tenantId_createdAt_idx";

-- AlterTable
ALTER TABLE "FaceSearchRequest" DROP CONSTRAINT "FaceSearchRequest_pkey",
DROP COLUMN "label",
DROP COLUMN "requestPayload",
DROP COLUMN "responsePayload",
DROP COLUMN "updatedAt",
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "requestData" JSONB NOT NULL,
ADD COLUMN     "resultData" JSONB NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'completed',
ADD CONSTRAINT "FaceSearchRequest_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "FaceSearchRequest_id_seq";

-- AlterTable
ALTER TABLE "ShareToken" DROP CONSTRAINT "ShareToken_pkey",
DROP COLUMN "requestId",
DROP COLUMN "sharedByEmail",
ADD COLUMN     "accessCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "apiType" "FaceSearchType" NOT NULL,
ADD COLUMN     "faceSearchRequestId" TEXT NOT NULL,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ShareToken_id_seq";

-- CreateIndex
CREATE INDEX "FaceSearchRequest_tenantId_idx" ON "FaceSearchRequest"("tenantId");

-- CreateIndex
CREATE INDEX "FaceSearchRequest_userId_idx" ON "FaceSearchRequest"("userId");

-- CreateIndex
CREATE INDEX "FaceSearchRequest_type_idx" ON "FaceSearchRequest"("type");

-- CreateIndex
CREATE INDEX "FaceSearchRequest_createdAt_idx" ON "FaceSearchRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ShareToken_tokenHash_idx" ON "ShareToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareToken_tenantId_idx" ON "ShareToken"("tenantId");

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_faceSearchRequestId_fkey" FOREIGN KEY ("faceSearchRequestId") REFERENCES "FaceSearchRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
