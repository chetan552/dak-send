-- Add performance indexes

-- Subscriber: fast webhook lookup by email, fast campaign dispatch by list+status
CREATE INDEX IF NOT EXISTS "Subscriber_email_idx" ON "Subscriber"("email");
CREATE INDEX IF NOT EXISTS "Subscriber_listId_status_idx" ON "Subscriber"("listId", "status");

-- CampaignSend: fast bounce/complaint lookup by email, fast completion check by campaign+status
CREATE INDEX IF NOT EXISTS "CampaignSend_subscriberEmail_idx" ON "CampaignSend"("subscriberEmail");
CREATE INDEX IF NOT EXISTS "CampaignSend_campaignId_status_idx" ON "CampaignSend"("campaignId", "status");

-- Campaign: fast cron scan for scheduled campaigns due to send
CREATE INDEX IF NOT EXISTS "Campaign_status_scheduledAt_idx" ON "Campaign"("status", "scheduledAt");
