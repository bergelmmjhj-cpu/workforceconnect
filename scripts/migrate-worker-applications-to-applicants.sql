-- Migration: Populate applicants table from worker_applications
-- Purpose: Sync worker registration data for use in the HR applicants portal
-- Usage: psql $DATABASE_URL < migrate-worker-applications-to-applicants.sql

-- Note: This migration maps worker application registrations (worker_applications table)
-- to the HR applicants tracking system (applicants table) for HR management.

DELETE FROM applicants WHERE id != (SELECT id FROM applicants LIMIT 1);

INSERT INTO applicants (
  id, full_name, phone, address_full, address_street, address_city, 
  address_province, address_postal_code, applying_for, job_posting_source, 
  status, submitted_at, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  full_name,
  phone,
  COALESCE(address || ', ' || city || ', ' || province, address || ', ' || city || ', ' || province),
  address,
  city,
  province,
  postal_code,
  COALESCE(
    (preferred_roles::jsonb ->> 0),
    'General Labor'
  ),
  'Direct Application',
  CASE 
    WHEN status = 'approved' THEN 'hired'
    WHEN status = 'rejected' THEN 'rejected'
    WHEN status = 'pending' THEN 'new'
    WHEN status = 'reviewed' THEN 'reviewing'
    ELSE 'new'
  END,
  created_at,
  created_at,
  created_at
FROM worker_applications
ORDER BY created_at DESC;

-- Fix applying_for to contain just the first role (not full JSON)
UPDATE applicants 
SET applying_for = TRIM(BOTH '"[],' FROM SPLIT_PART(applying_for, ',', 1))
WHERE applying_for LIKE '[%';

SELECT COUNT(*) as total_applicants, 
       COUNT(CASE WHEN status='hired' THEN 1 END) as hired,
       COUNT(CASE WHEN status='new' THEN 1 END) as new_applicants
FROM applicants;
