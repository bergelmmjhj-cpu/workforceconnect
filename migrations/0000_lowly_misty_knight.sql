ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "agreement_version" text;
--> statement-breakpoint
ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "non_solicitation_acknowledged" boolean;
--> statement-breakpoint
ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "non_solicitation_acknowledged_at" timestamp;
--> statement-breakpoint
ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "worker_pdf_generated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "internal_pdf_generated_at" timestamp;