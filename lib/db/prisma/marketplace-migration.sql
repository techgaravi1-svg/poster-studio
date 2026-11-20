-- SQL that 'pnpm --filter @workspace/db run push' applies for the seller marketplace.
-- Additive only: new tables/columns with defaults, no DROP. Existing products become APPROVED.
-- Generated with: prisma migrate diff (committed schema -> new schema). For review only.

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "approvalStatus" "ListingStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "razorpayOrderId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "fulfillmentStatus" "OrderFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "description" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "upiId" TEXT,
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_email_key" ON "sellers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_storeSlug_key" ON "sellers"("storeSlug");

-- CreateIndex
CREATE INDEX "sellers_status_idx" ON "sellers"("status");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_approvalStatus_idx" ON "products"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpayOrderId_key" ON "orders"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "order_items_sellerId_idx" ON "order_items"("sellerId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

