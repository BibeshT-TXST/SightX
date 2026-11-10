### Problem:
Scan jobs, AI results, suggestions and decisions need durable, relational storage that the private API Lambda and the worker can both reach, without storing app passwords, and at student-project cost

### Options Rejected:
- Keeping Supabase: a second cloud outside the VPC, reachable only over the internet, which the private Lambda does not have
- DynamoDB: cheap at rest, but the patient-history query (earlier finished scans of one patient), the write-once decision rule and column-level permissions are natural in SQL and awkward without it
- Aurora Serverless v2: scales to zero only with long cold starts, and its minimum capacity costs more than a micro instance
- Multi-AZ: doubles the instance cost for availability a trial does not need
- RDS Proxy: billed per vCPU of the database (~$20+/month); Lambda concurrency and a one-connection pool per instance keep connections low instead
- App passwords in Secrets Manager: each secret costs money and a private Lambda would need a Secrets Manager interface endpoint to read it

### Choice:
- RDS PostgreSQL 16, `db.t4g.micro`, 20 GB encrypted gp3, no storage autoscaling, single-AZ in us-east-2a (same AZ as the worker, so no cross-AZ transfer charges), private subnets only
- IAM database authentication: `sightx_api` and `sightx_worker` have no password; tokens are signed locally per connection (no network call, no endpoint)
- The master password is generated and kept by RDS in Secrets Manager (~$0.40/month) and used only for migrations, run from the worker over SSM
- Column-level grants: the API can only write the decision; the worker can never write it. A trigger makes the decision write-once even for the owner
- 7-day backups, final snapshot on delete, deletion protection; Performance Insights and Enhanced Monitoring off
- Cost: ~$14.40/month; stopping the instance between demos leaves storage only

## What could change in the future:
- Multi-AZ, larger instance or RDS Proxy once real traffic or uptime requirements justify the cost
- A migration runner (CI job or one-off task) instead of running `psql` by hand over SSM
