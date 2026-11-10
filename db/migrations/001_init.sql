-- ─────────────────────────────────────────────────────────────────────────────
-- SightX schema v1: patients, jobs
--
-- Replaces the Supabase `patient_scans` table. V2 is an open trial with no
-- sign-in: each browser generates a random session ID, and every row
-- belongs to one session. Sessions keep visitors' data apart; they are not
-- authentication. Use made-up patient details only.
--
--   patients  one row per patient per session, so a new scan can see that
--             patient's history
--   jobs      one row per scan: the uploaded image, the AI result, the Bedrock
--             suggestion and the final decision
-- Requires PostgreSQL 13+ (gen_random_uuid is built in).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Patients ("Data table" in the architecture diagram) ─────────────────────
CREATE TABLE patients (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid        NOT NULL,         -- trial session that created it
    mrn         text        NOT NULL,         -- the scan form's "Patient ID"
    full_name   text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),

    -- The same Patient ID in two sessions is two different patients, so
    -- one visitor's history never reaches another visitor's suggestion
    CONSTRAINT patients_session_mrn_key UNIQUE (session_id, mrn)
);

-- ── Jobs ─────────────────────────────────────────────────────────────────────
-- Lifecycle: queued → processing → graded → suggested
--            any step before graded can end in failed
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'graded', 'suggested', 'failed');

CREATE TABLE jobs (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       uuid        NOT NULL,          -- trial session that created it
    patient_id       uuid        NOT NULL REFERENCES patients (id),
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

    -- Final decision: the only write a user makes, and only once
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

-- History page: a session's scans, newest first
CREATE INDEX jobs_session_created_idx ON jobs (session_id, created_at DESC);
-- Bedrock suggestion: a patient's earlier scans, newest first
CREATE INDEX jobs_patient_created_idx ON jobs (patient_id, created_at DESC);

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
