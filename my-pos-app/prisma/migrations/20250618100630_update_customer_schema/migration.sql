-- DropIndex
DROP INDEX "Customer_email_key";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "isMember" SET DEFAULT true;
