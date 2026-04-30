ALTER TABLE "worker_applications"
ADD COLUMN IF NOT EXISTS "independent_contractor_status_acknowledged" boolean DEFAULT false;
