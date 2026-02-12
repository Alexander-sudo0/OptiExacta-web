-- CreateEnum
CREATE TYPE "FaceSearchType" AS ENUM ('ONE_TO_ONE', 'ONE_TO_N', 'N_TO_N');

-- CreateTable
CREATE TABLE "FaceSearchRequest" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "FaceSearchType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "label" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceSearchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestId" INTEGER NOT NULL,
    "sharedByEmail" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceSearchRequest_tenantId_createdAt_idx" ON "FaceSearchRequest"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareToken_tokenHash_key" ON "ShareToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareToken_expiresAt_idx" ON "ShareToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "FaceSearchRequest" ADD CONSTRAINT "FaceSearchRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceSearchRequest" ADD CONSTRAINT "FaceSearchRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FaceSearchRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

