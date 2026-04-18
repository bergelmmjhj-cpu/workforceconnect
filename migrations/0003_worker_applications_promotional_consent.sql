ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "promotional_consent" boolean DEFAULT false;

UPDATE "worker_applications"
SET "promotional_consent" = false
WHERE "promotional_consent" IS NULL;

ALTER TABLE "worker_applications"
ALTER COLUMN "promotional_consent" SET DEFAULT false;

ALTER TABLE "worker_applications"
ALTER COLUMN "promotional_consent" SET NOT NULL;