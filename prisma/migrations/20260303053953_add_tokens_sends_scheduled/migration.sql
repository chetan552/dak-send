-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "goodbyeEmailHtml" TEXT,
ADD COLUMN     "optIn" TEXT NOT NULL DEFAULT 'single',
ADD COLUMN     "optInConfirmationUrl" TEXT,
ADD COLUMN     "requireGdpr" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unsubscribeConfirmationUrl" TEXT,
ADD COLUMN     "welcomeEmailHtml" TEXT;

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "hasConfirmedGdpr" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriberFieldValue" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriberFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SubscriptionToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'confirm',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberEmail" TEXT NOT NULL,
    "subscriberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BrandUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BrandUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CampaignIncludedLists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaignIncludedLists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CampaignExcludedLists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaignExcludedLists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CampaignIncludedSegments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaignIncludedSegments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CampaignExcludedSegments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaignExcludedSegments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_name_listId_key" ON "CustomField"("name", "listId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberFieldValue_subscriberId_customFieldId_key" ON "SubscriberFieldValue"("subscriberId", "customFieldId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionToken_token_key" ON "SubscriptionToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSend_campaignId_subscriberEmail_key" ON "CampaignSend"("campaignId", "subscriberEmail");

-- CreateIndex
CREATE INDEX "_BrandUsers_B_index" ON "_BrandUsers"("B");

-- CreateIndex
CREATE INDEX "_CampaignIncludedLists_B_index" ON "_CampaignIncludedLists"("B");

-- CreateIndex
CREATE INDEX "_CampaignExcludedLists_B_index" ON "_CampaignExcludedLists"("B");

-- CreateIndex
CREATE INDEX "_CampaignIncludedSegments_B_index" ON "_CampaignIncludedSegments"("B");

-- CreateIndex
CREATE INDEX "_CampaignExcludedSegments_B_index" ON "_CampaignExcludedSegments"("B");

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriberFieldValue" ADD CONSTRAINT "SubscriberFieldValue_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriberFieldValue" ADD CONSTRAINT "SubscriberFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionToken" ADD CONSTRAINT "SubscriptionToken_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandUsers" ADD CONSTRAINT "_BrandUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandUsers" ADD CONSTRAINT "_BrandUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignIncludedLists" ADD CONSTRAINT "_CampaignIncludedLists_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignIncludedLists" ADD CONSTRAINT "_CampaignIncludedLists_B_fkey" FOREIGN KEY ("B") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignExcludedLists" ADD CONSTRAINT "_CampaignExcludedLists_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignExcludedLists" ADD CONSTRAINT "_CampaignExcludedLists_B_fkey" FOREIGN KEY ("B") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignIncludedSegments" ADD CONSTRAINT "_CampaignIncludedSegments_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignIncludedSegments" ADD CONSTRAINT "_CampaignIncludedSegments_B_fkey" FOREIGN KEY ("B") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignExcludedSegments" ADD CONSTRAINT "_CampaignExcludedSegments_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignExcludedSegments" ADD CONSTRAINT "_CampaignExcludedSegments_B_fkey" FOREIGN KEY ("B") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
