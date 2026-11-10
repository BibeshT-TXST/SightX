-- ─────────────────────────────────────────────────────────────────────────────
-- SightX schema v1: users, patients, jobs
--
-- Replaces the Supabase `profiles` and `patient_scans` tables.
--   users     one row per clinician, keyed by their Cognito user ID (sub)
--   patients  one row per patient, so a new scan can see the patient's history
--   jobs      one row per scan: the uploaded image, the AI result, the Bedrock
--             suggestion and the clinician's final decision
-- Requires PostgreSQL 13+ (gen_random_uuid is built in).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Users ────────────────────────────────────────────────────────────────────
-- Created on a clinician's first API call, from their Cognito token.
CREATE TABLE users (
    id               uuid        PRIMARY KEY,               -- Cognito `sub`
    email            text        NOT NULL UNIQUE,
    first_name       text        NOT NULL,
    last_name        text        NOT NULL,
    practitioner_id  text        UNIQUE,                    -- hospital staff ID
    role             text        NOT NULL DEFAULT 'clinician'
                     CHECK (role IN ('superuser', 'clinician', 'resident', 'fellow', 'attending')),
    clinical_unit    text,
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Patients ("Data table" in the architecture diagram) ─────────────────────
CREATE TABLE patients (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn         text        NOT NULL UNIQUE,  -- hospital patient ID (the scan form's "Patient ID")
    full_name   text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Jobs ─────────────────────────────────────────────────────────────────────
-- Lifecycle: queued → processing → graded → suggested
--            any step before graded can end in failed
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'graded', 'suggested', 'failed');

CREATE TABLE jobs (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id       uuid        NOT NULL REFERENCES patients (id),
    practitioner_id  uuid        NOT NULL REFERENCES users (id),
    image_key        text        NOT NULL UNIQUE,   -- S3 object key of the uploaded scan

    -- Processing state, written by the worker
    status           job_status  NOT NULL DEFAULT 'queued',
    attempts         integer     NOT NULL DEFAULT 0,
    error            text,                          -- last failure, shown when status = failed

    -- AI output
    result           jsonb,                         -- full predictor.predict() output
    ai_diagnosis     text GENERATED ALWAYS AS (result ->> 'tier') STORED,
    graded_at        timestamptz,

    -- Bedrock suggestion (optional: a failure here leaves the job graded)
    suggestion       text,
    suggestion_model text,
    suggested_at     timestamptz,

    -- Clinician decision: the only write a clinician makes, and only once
    final_diagnosis  text,
    decided_at       timestamptz,

    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    -- A decision needs an AI result to decide on, and comes with a timestamp
    CONSTRAINT decision_after_grading CHECK (
        final_diagnosis IS NULL
        OR (status IN ('graded', 'suggested') AND decided_at IS NOT NULL)
    )
);

-- Accounts page: a clinician's scans, newest first
CREATE INDEX jobs_practitioner_created_idx ON jobs (practitioner_id, created_at DESC);
-- Bedrock suggestion: a patient's earlier scans, newest first
CREATE INDEX jobs_patient_created_idx      ON jobs (patient_id, created_at DESC);

-- ── Triggers ─────────────────────────────────────────────────────────────────

-- Keep updated_at current on every change
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_set_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A recorded decision can never be changed or cleared. Changing one would
-- need hospital management involved, outside this application.
CREATE FUNCTION forbid_decision_change() RETURNS trigger AS $$
BEGIN
    IF OLD.final_diagnosis IS NOT NULL
       AND (NEW.final_diagnosis IS DISTINCT FROM OLD.final_diagnosis
            OR NEW.decided_at IS DISTINCT FROM OLD.decided_at) THEN
        RAISE EXCEPTION 'job %: the final diagnosis is already recorded and cannot be changed', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_forbid_decision_change
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION forbid_decision_change();

COMMIT;
