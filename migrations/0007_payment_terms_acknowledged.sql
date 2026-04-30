ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "payment_terms_acknowledged" boolean DEFAULT false;
