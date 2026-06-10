CREATE TABLE IF NOT EXISTS project_manager_applications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text NOT NULL UNIQUE,
  application_type text NOT NULL DEFAULT 'PROJECT_MANAGER',
  entity_type text NOT NULL,
  legal_business_name text NOT NULL,
  operating_name text,
  corporation_number text,
  tax_number text,
  contact_legal_name text NOT NULL,
  contact_title text,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  business_description text,
  status text NOT NULL DEFAULT 'SUBMITTED',
  admin_notes text,
  reviewed_by varchar,
  reviewed_at timestamp,
  conditionally_approved_at timestamp,
  executed_agreement_id varchar,
  portal_token_hash text,
  portal_token_expires_at timestamp,
  submitted_ip text,
  submitted_user_agent text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_manager_applications_email_idx ON project_manager_applications(email);
CREATE INDEX IF NOT EXISTS project_manager_applications_status_idx ON project_manager_applications(status);

CREATE TABLE IF NOT EXISTS project_manager_workers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES project_manager_applications(id),
  legal_name text NOT NULL,
  relationship_type text NOT NULL,
  role text,
  email text,
  phone text,
  work_eligibility_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'PROPOSED',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_manager_workers_application_idx ON project_manager_workers(application_id);

CREATE TABLE IF NOT EXISTS project_manager_documents (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES project_manager_applications(id),
  category text NOT NULL,
  original_file_name text NOT NULL,
  storage_key text NOT NULL,
  encrypted_content text NOT NULL,
  mime_type text NOT NULL,
  sha256 text NOT NULL,
  expires_at timestamp,
  status text NOT NULL DEFAULT 'UPLOADED',
  uploaded_by text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_manager_documents_application_idx ON project_manager_documents(application_id);

CREATE TABLE IF NOT EXISTS project_manager_agreements (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES project_manager_applications(id),
  agreement_number text NOT NULL UNIQUE,
  agreement_type text NOT NULL DEFAULT 'PROJECT_MANAGER_SERVICES_AGREEMENT',
  status text NOT NULL DEFAULT 'Not Generated',
  current_version_id varchar,
  executed_version_id varchar,
  supersedes_agreement_id varchar,
  suspended_at timestamp,
  cancelled_at timestamp,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_manager_agreements_application_idx ON project_manager_agreements(application_id);
CREATE INDEX IF NOT EXISTS project_manager_agreements_status_idx ON project_manager_agreements(status);

CREATE TABLE IF NOT EXISTS project_manager_agreement_versions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id varchar NOT NULL REFERENCES project_manager_agreements(id),
  version_number integer NOT NULL,
  title text NOT NULL DEFAULT 'PROJECT MANAGER INDEPENDENT SERVICES AGREEMENT',
  body_snapshot text NOT NULL,
  schedules_snapshot text NOT NULL,
  commercial_terms_snapshot text NOT NULL,
  content_sha256 text NOT NULL,
  is_executed boolean NOT NULL DEFAULT false,
  final_pdf_base64 text,
  final_pdf_sha256 text,
  executed_at timestamp,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT project_manager_agreement_version_unique UNIQUE (agreement_id, version_number)
);

CREATE TABLE IF NOT EXISTS project_manager_acknowledgments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_version_id varchar NOT NULL REFERENCES project_manager_agreement_versions(id),
  application_id varchar NOT NULL REFERENCES project_manager_applications(id),
  acknowledgment_key text NOT NULL,
  acknowledgment_text text NOT NULL,
  accepted boolean NOT NULL,
  accepted_at timestamp NOT NULL,
  ip text,
  user_agent text,
  CONSTRAINT project_manager_ack_version_key_unique UNIQUE (agreement_version_id, acknowledgment_key)
);

CREATE TABLE IF NOT EXISTS project_manager_signatures (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_version_id varchar NOT NULL REFERENCES project_manager_agreement_versions(id),
  signer_role text NOT NULL,
  signer_legal_name text NOT NULL,
  signer_title text,
  signature_text text NOT NULL,
  signed_at timestamp NOT NULL,
  ip text,
  user_agent text,
  signature_sha256 text NOT NULL,
  CONSTRAINT project_manager_signature_version_role_unique UNIQUE (agreement_version_id, signer_role)
);

CREATE TABLE IF NOT EXISTS project_manager_signing_links (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_version_id varchar NOT NULL REFERENCES project_manager_agreement_versions(id),
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL,
  expires_at timestamp NOT NULL,
  first_viewed_at timestamp,
  completed_at timestamp,
  revoked_at timestamp,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_manager_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES project_manager_applications(id),
  agreement_id varchar NOT NULL REFERENCES project_manager_agreements(id),
  assignment_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'DRAFT',
  project_name text NOT NULL,
  client_site text,
  scope text NOT NULL,
  start_date date,
  end_date date,
  rates_snapshot text NOT NULL,
  terms_snapshot text NOT NULL,
  worker_ids_snapshot text NOT NULL,
  pdf_base64 text,
  pdf_sha256 text,
  issued_at timestamp,
  accepted_at timestamp,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_manager_notices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES project_manager_applications(id),
  agreement_id varchar REFERENCES project_manager_agreements(id),
  notice_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  acknowledged_at timestamp,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_manager_audit_log (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar REFERENCES project_manager_applications(id),
  agreement_id varchar REFERENCES project_manager_agreements(id),
  agreement_version_id varchar REFERENCES project_manager_agreement_versions(id),
  actor_type text NOT NULL,
  actor_id text,
  event_type text NOT NULL,
  metadata text NOT NULL DEFAULT '{}',
  ip text,
  user_agent text,
  previous_hash text,
  event_hash text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_manager_audit_agreement_idx ON project_manager_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS project_manager_audit_application_idx ON project_manager_audit_log(application_id);

ALTER TABLE project_manager_applications
  ADD CONSTRAINT project_manager_applications_executed_agreement_fk
  FOREIGN KEY (executed_agreement_id) REFERENCES project_manager_agreements(id);
ALTER TABLE project_manager_agreements
  ADD CONSTRAINT project_manager_agreements_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES project_manager_agreement_versions(id);
ALTER TABLE project_manager_agreements
  ADD CONSTRAINT project_manager_agreements_executed_version_fk
  FOREIGN KEY (executed_version_id) REFERENCES project_manager_agreement_versions(id);

CREATE OR REPLACE FUNCTION prevent_project_manager_executed_version_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_executed = true THEN
    RAISE EXCEPTION 'Executed Project Manager agreement versions are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_manager_executed_version_immutable
  ON project_manager_agreement_versions;
CREATE TRIGGER project_manager_executed_version_immutable
BEFORE UPDATE OR DELETE ON project_manager_agreement_versions
FOR EACH ROW EXECUTE FUNCTION prevent_project_manager_executed_version_mutation();
