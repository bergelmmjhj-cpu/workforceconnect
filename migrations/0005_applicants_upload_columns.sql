ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "photo_data" text;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "photo_filename" text;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "photo_mime_type" text;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "photo_file_size" integer;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "resume_data" text;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "resume_filename" text;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "resume_mime_type" text;

ALTER TABLE "applicants"
ADD COLUMN IF NOT EXISTS "resume_file_size" integer;