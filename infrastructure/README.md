# SightX Infrastructure (Terraform)

Every AWS resource for the V2 trial, in `us-east-2`. The design is explained in [SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md) and the reasoning behind each step in [Docs/decisions](../Docs/decisions/).

| File | Creates |
| :--- | :--- |
| `bootstrap/` | The versioned, encrypted S3 bucket holding Terraform state (run once per account, local state) |
| `backend.tf`, `providers.tf` | State backend (S3 with lockfile) and providers |
| `network.tf` | VPC, one public and two private subnets, route tables, S3 gateway endpoint, security groups |
| `rds.tf` | Private single-AZ PostgreSQL 16 with IAM auth |
| `queues.tf` | Inference queue and dead-letter queue |
| `storage.tf` | Scans bucket: expiry, CORS, S3 → SQS events |
| `api.tf` | API Lambda (zipped from `api/`) and the HTTP API |
| `worker.tf`, `files/` | EC2 worker: Auto Scaling group of one, launch template, boot script |
| `frontend.tf` | Frontend bucket and CloudFront distribution |
| `monitoring.tf` | Optional dead-letter-queue alarm |
| `variables.tf`, `outputs.tf` | Tunables and the values deploys need |

---

## Prerequisites

- AWS CLI v2, configured with credentials for the target account
- [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) for the AWS CLI
- Terraform 1.10+
- Node.js 22 (API package and frontend build)

All commands below run from `infrastructure/` unless they `cd` elsewhere.

---

## First deploy

### 1. State bucket (new account only)

```bash
cd infrastructure/bootstrap && terraform init && terraform apply
```
Put the bucket name it prints into `backend.tf` if it differs.

### 2. Settings

Create `infrastructure/terraform.tfvars` (gitignored):

```hcl
# Branch or tag the worker installs from. Use your feature branch to test
# before merging; main once merged.
worker_git_ref = "main"

# Existing SNS topic for the dead-letter alarm (optional)
alarm_sns_topic_arn = "arn:aws:sns:us-east-2:123456789012:my-alerts"
```

The worker clones the repository at boot, so the ref must be **pushed** to GitHub first.

### 3. Build the API package

Terraform zips `api/` as it is on disk:

```bash
cd api && npm ci --omit=dev && cd ..
```

### 4. Apply

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

RDS and CloudFront take 5–10 minutes each. The worker starts installing itself as soon as its instance launches.

### 5. Watch the worker boot (about 5 minutes)

```bash
INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$(terraform output -raw worker_asg_name)" \
  --query 'AutoScalingGroups[0].Instances[0].InstanceId' --output text)
aws ssm start-session --target "$INSTANCE_ID"
```

On the instance:

```bash
sudo tail -f /var/log/sightx-bootstrap.log      # ends with "sightx-update: running <sha>"
journalctl -u sightx-worker -f                  # "worker started; polling ..."
```

### 6. Run the database migrations

The database is private, so migrations run from the worker over SSM. First, on your machine, read the master password (RDS generated it):

```bash
aws secretsmanager get-secret-value \
  --secret-id "$(terraform output -raw db_master_secret_arn)" \
  --query SecretString --output text      # {"username":"sightx_admin","password":"..."}
```

Then, in the SSM session:

```bash
read -rs PGPASSWORD && export PGPASSWORD       # paste the password; it is not echoed
DB_HOST=$(sudo grep '^DB_HOST=' /etc/sightx-worker.env | cut -d= -f2)
for f in /opt/sightx/repo/db/migrations/*.sql; do
  psql "host=$DB_HOST dbname=sightx user=sightx_admin sslmode=require" -v ON_ERROR_STOP=1 -f "$f"
done
unset PGPASSWORD
```

Check the API end to end (any UUID works as a session):

```bash
curl -H "X-Trial-Session: 11111111-1111-4111-8111-111111111111" "$(terraform output -raw api_url)/jobs"
# {"jobs":[]}
```

### 7. Deploy the frontend

```bash
echo "VITE_API_URL=$(terraform output -raw api_url)" > ../frontend/.env.local
cd ../frontend && npm ci && npm run build
aws s3 sync dist "s3://$(cd ../infrastructure && terraform output -raw frontend_bucket)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd ../infrastructure && terraform output -raw frontend_distribution_id)" \
  --paths "/index.html"
```

Open `terraform output -raw frontend_url`, click **Try It Out**, and run a scan.

---

## Day-to-day operations

| Task | How |
| :--- | :--- |
| Deploy API changes | `cd api && npm ci --omit=dev`, then `terraform apply` (the zip hash changes) |
| Deploy worker changes on the same ref | SSM session, `sudo sightx-update` |
| Switch the worker to another ref | Change `worker_git_ref`, `terraform apply` (instance refresh replaces it) |
| Deploy frontend changes | Step 7 again |
| API logs | CloudWatch log group `/aws/lambda/sightx-api` (kept 14 days) |
| Worker logs | SSM session, `journalctl -u sightx-worker` |
| Failed scans | SQS console → `sightx-inference-dlq`: inspect, fix, then **Start DLQ redrive** |
| Change TTA cost | `worker_tta_passes` / `worker_tta_batch_size`, `terraform apply` |

### Pausing to save money

- **RDS**: `aws rds stop-db-instance --db-instance-identifier sightx-db` (storage only; AWS restarts it after 7 days).
- **Worker**: `aws autoscaling update-auto-scaling-group --auto-scaling-group-name sightx-worker --min-size 0 --max-size 0 --desired-capacity 0`. Scans queue up and are graded when it returns. The next `terraform apply` sets it back to one.

### Tearing down

1. Set `deletion_protection = false` in `rds.tf` and `terraform apply`.
2. Empty both buckets (`aws s3 rm s3://<bucket> --recursive`).
3. `terraform destroy`. RDS keeps a final snapshot, `sightx-db-final`; delete it by hand if you no longer need it.

---

## Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `worker_git_ref` | `main` | Branch or tag the worker runs |
| `worker_git_url` | this repository | Public repository the worker clones |
| `worker_instance_type` | `t4g.small` | Worker size; x86 types work too |
| `worker_tta_passes` | `108` | TTA passes per scan |
| `worker_tta_batch_size` | `4` | Passes per forward pass (memory) |
| `bedrock_model_id` | `us.amazon.nova-micro-v1:0` | Suggestion model (US inference profile) |
| `max_receive_count` | `3` | Deliveries before the dead-letter queue (also the worker's `MAX_RECEIVE_COUNT`) |
| `job_visibility_timeout_seconds` | `300` | Must exceed the slowest scan |
| `scan_retention_days` | `7` | Days uploaded images are kept |
| `dev_origins` | `["http://localhost:5173"]` | Extra CORS origins besides CloudFront |
| `api_rate_limit` / `api_burst_limit` | `10` / `20` | HTTP API throttling |
| `api_reserved_concurrency` | `-1` | Lambda concurrency cap; set e.g. `5` once your account limit is 1000 |
| `alarm_sns_topic_arn` | `""` | SNS topic for the dead-letter alarm; empty creates none |

## Checks

CI runs `terraform fmt -check -recursive` and `terraform validate` (without a backend) on every pull request. Locally:

```bash
terraform fmt -recursive
terraform validate
```
