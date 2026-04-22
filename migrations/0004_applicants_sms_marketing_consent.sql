ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "marketing_consent" boolean DEFAULT false;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "marketing_consent_at" timestamp;

UPDATE "applicants"
SET "sms_consent" = true;

UPDATE "applicants"
SET "sms_consent_at" = COALESCE("submitted_at", "created_at", NOW())
WHERE "sms_consent" = true
  AND "sms_consent_at" IS NULL;

UPDATE "applicants"
SET "marketing_consent" = COALESCE("promotional_consent", false);

UPDATE "applicants"
SET "marketing_consent_at" = COALESCE("submitted_at", "created_at", NOW())
WHERE "marketing_consent" = true
  AND "marketing_consent_at" IS NULL;

ALTER TABLE "applicants"
ALTER COLUMN "sms_consent" SET DEFAULT false;

ALTER TABLE "applicants"
ALTER COLUMN "sms_consent" SET NOT NULL;

ALTER TABLE "applicants"
ALTER COLUMN "marketing_consent" SET DEFAULT false;

ALTER TABLE "applicants"
ALTER COLUMN "marketing_consent" SET NOT NULL;