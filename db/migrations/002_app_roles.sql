-- ─────────────────────────────────────────────────────────────────────────────
-- SightX schema v2: least-privilege database roles
--
--   sightx_api     the API Lambda: creates users, patients and jobs, reads
--                  them back, and records the clinician's decision
--   sightx_worker  the inference worker: claims jobs and writes AI results
--                  and Bedrock suggestions; reads patient history
--
-- Neither role has a password. On RDS they log in with IAM auth tokens
-- (membership in rds_iam); on a local Postgres, connect as your own user.
-- Column-level UPDATE grants mean the API can only ever write the decision,
-- and the worker can never write it.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sightx_api') THEN
        CREATE ROLE sightx_api LOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sightx_worker') THEN
        CREATE ROLE sightx_worker LOGIN;
    END IF;

    -- rds_iam only exists on RDS; skip it on a local Postgres
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rds_iam') THEN
        GRANT rds_iam TO sightx_api, sightx_worker;
    END IF;
END
$$;

-- Nobody but the owner creates objects in the public schema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO sightx_api, sightx_worker;

-- ── API ──────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON users    TO sightx_api;
GRANT SELECT, INSERT ON patients TO sightx_api;
GRANT SELECT, INSERT ON jobs     TO sightx_api;
GRANT UPDATE (final_diagnosis, decided_at) ON jobs TO sightx_api;

-- ── Worker ───────────────────────────────────────────────────────────────────
GRANT SELECT ON patients TO sightx_worker;
GRANT SELECT ON jobs     TO sightx_worker;
GRANT UPDATE (
    status, attempts, error,
    result, graded_at,
    suggestion, suggestion_model, suggested_at
) ON jobs TO sightx_worker;

COMMIT;
