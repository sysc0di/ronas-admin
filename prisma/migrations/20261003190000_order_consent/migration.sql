-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "locale" TEXT,
ADD COLUMN     "distanceSalesAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preInformationAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "legalVersion" TEXT,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3);
