# SightX Database

PostgreSQL schema for the AWS deployment (RDS). It replaces the Supabase `profiles` and `patient_scans` tables.

V2 is an open trial with no sign-in. Each browser generates a random session ID, and every patient and job belongs to one session, so visitors never see each other's scans. Sessions separate data; they are not authentication, so the trial must only be used with made-up patient details.

| Table | Holds |
| --- | --- |
| `patients` | One row per patient per session (`mrn` is the form's Patient ID, unique within a session) |
| `jobs` | One row per scan: session, image key, status, AI result, Bedrock suggestion, final decision |

A job moves `queued → processing → graded → suggested`, or to `failed`. The `final_diagnosis` can be written once and never changed; a trigger enforces this even for the database owner.

## Migrations

Files in `migrations/` run in filename order, once each. Every file is wrapped in a transaction, so a failed file leaves nothing half-applied.

```bash
for f in db/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Never edit a migration that has already run against RDS. Add a new numbered file instead.

## Roles

`002_app_roles.sql` creates two login roles with no password:

- `sightx_api` (API Lambda): inserts patients and jobs; can update only `final_diagnosis` and `decided_at`.
- `sightx_worker` (inference worker): reads jobs and patients; can update only status, result and suggestion columns.

On RDS both are granted `rds_iam` and log in with IAM auth tokens, so no database password is stored anywhere. Locally, connect as your own Postgres user.

## Try it locally

No local `psql` needed; this uses the one inside the container:

```bash
docker run --rm -d --name sightx-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
for f in db/migrations/*.sql; do
  docker exec -i sightx-pg psql -U postgres -v ON_ERROR_STOP=1 < "$f"
done
docker stop sightx-pg   # --rm deletes it
```
