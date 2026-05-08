ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "address_latitude" double precision;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "address_longitude" double precision;
