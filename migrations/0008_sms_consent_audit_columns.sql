ALTER TABLE "contact_leads"
ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false;

ALTER TABLE "contact_leads"
ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp;

ALTER TABLE "contact_leads"
ALTER COLUMN "sms_consent" SET NOT NULL;

ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false;

ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp;

ALTER TABLE "worker_applications"
ALTER COLUMN "sms_consent" SET NOT NULL;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "marketing_consent" boolean DEFAULT false;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "marketing_consent_at" timestamp;

ALTER TABLE "applicants"
ALTER COLUMN "sms_consent" SET NOT NULL;

ALTER TABLE "applicants"
ALTER COLUMN "marketing_consent" SET NOT NULL;
