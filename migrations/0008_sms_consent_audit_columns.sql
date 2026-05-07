ALTER TABLE "contact_leads"
ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false;

ALTER TABLE "contact_leads"
ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp;

ALTER TABLE "contact_leads"
ALTER COLUMN "sms_consent" SET DEFAULT false;

ALTER TABLE "contact_leads"
ALTER COLUMN "sms_consent" SET NOT NULL;

ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false;

ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp;

ALTER TABLE "worker_applications"
ALTER COLUMN "sms_consent" SET DEFAULT false;

ALTER TABLE "worker_applications"
ALTER COLUMN "sms_consent" SET NOT NULL;
