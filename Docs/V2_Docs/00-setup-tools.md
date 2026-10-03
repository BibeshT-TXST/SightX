# Setting up the tools, AWS access and Terraform state
**Branch:** `feature/tooling-and-roles`
**Date:** 3 October 2026, roughly 13:20 to 15:45
**Region:** `us-east-2` (Ohio)
**AWS account:** `142366489647`

This is the groundwork for moving SightX onto AWS. By the end of the session, my laptop could talk to AWS as a dedicated IAM user, a private S3 bucket held Terraform's state, and an empty main Terraform stack used that bucket and was ready for real infrastructure. No application infrastructure exists yet: no network, database, Lambdas, queues or service roles.

## What I did, in order
### 1. Stopped using the root user
The console login I started with was the account's root user. Root can do anything on the account, including closing it, so it shouldn't be used for everyday work. I created an IAM user called `sightx-bibeshT` in the IAM console, gave it the `AdministratorAccess` policy, and didn't give it console access because it's only for the command line. I then created one access key for it, with the use case "Command Line Interface". The secret key is shown only once, so I stored it outside the repo.

The user has administrator rights because Terraform will later create IAM roles, networking and databases. Narrowing a deployer down to exactly those permissions is a project of its own. For a personal account, broad access is the usual trade-off.

### 2. Installed and configured the AWS CLI
I installed the AWS CLI with Homebrew (version 2.37.9) and ran `aws configure` with the new access key, region `us-east-2` and JSON output. The credentials live in `~/.aws/credentials` and the region in `~/.aws/config`, both in my home folder and outside the repo. Running `aws sts get-caller-identity` confirmed the CLI acts as `sightx-bibeshT` and not as root.

### 3. Checked that the region offers Bedrock
The app will later use Amazon Bedrock to write suggestion text, so I confirmed that Ohio offers it before committing to the region. A read-only listing showed 38 Bedrock text models available on demand in `us-east-2`, plus 91 cross-region inference profiles. I haven't picked a model yet; that happens when the suggestion feature is built.

### 4. Git ignore's Terraform's private files
Before writing any Terraform, I added four patterns to `.gitignore`:

*.tfstate
*.tfstate.*
.terraform/
*.tfvars

State files (`*.tfstate`) are a full record of every real resource. Once a database exists, they'll also hold its master password in plain text. `.terraform/` is the folder of downloaded provider plugins, which `terraform init` rebuilds. `*.tfvars` files hold real variable values, which can include secrets. I added these rules first, so no state could be committed by accident.

The `.terraform.lock.hcl` files are not ignored on purpose. They pin the exact provider versions so that every machine builds with the same ones, and HashiCorp recommends committing them.

### 5. Created the state bucket with a small "bootstrap" configuration

Terraform needs somewhere durable to keep its state. I wanted that to be an S3 bucket, which creates a chicken-and-egg problem: the main stack can't create the bucket it stores its own state in, because the bucket has to exist before the main stack's first `terraform init`.

The fix is a second, tiny Terraform configuration in `infra/bootstrap/main.tf` that creates only the bucket and keeps its own state as a local file. Terraform reads only the `.tf` files in the folder you run it from, so this configuration never mixes with the main stack in `infra/`.

The bucket is named `sightx-tfstate-142366489647`. Putting the account ID in the name keeps it globally unique, and the configuration looks the ID up itself with `data "aws_caller_identity"`. The bucket is set up as follows:

- **Versioning is on**, so an overwritten or corrupted state file can be rolled back.
- **Encryption is on** (AES256).
- **All four public-access blocks are on**, so nothing in it can ever be made public.
- **It's tagged `project=sightx`.**
- **`prevent_destroy` is set in Terraform**, so Terraform refuses to delete it.

I ran `terraform init`, `validate` and `plan` (4 resources to add), then `terraform apply`. The bootstrap state now lives at `infra/bootstrap/terraform.tfstate`. That file is git-ignored and exists only on this laptop.

### 6. Created the main Terraform stack
The main stack in `infra/` currently has two real files:

- **`backend.tf`** sets the minimum Terraform version (1.10), pins the AWS provider to 6.x, and tells Terraform to keep this stack's state in the bucket under `main/terraform.tfstate`. It has `encrypt = true` and `use_lockfile = true`. The bucket name is typed in literally, because a backend block can't use variables or references. AWS doesn't treat account IDs as secret, so having it in the repo is fine.
- **`providers.tf`** sets the region to `us-east-2` and adds `default_tags` with `project = "sightx"`, so every resource the stack creates is tagged automatically and cost reports can filter by project.

For locking, I chose S3's native lockfile over a DynamoDB table. While a run is in progress, Terraform writes a small `.tflock` object next to the state, which stops two runs from changing it at once. The DynamoDB method is deprecated and would have meant one more resource to create and pay for(not ideal for a student project).

Alongside those two files are nine placeholder files, one per upcoming piece of infrastructure. Each contains a single comment line:

network.tf    VPC and networking
cognito.tf    Cognito (sign-in)
rds.tf        RDS PostgreSQL
storage.tf    S3 buckets
queues.tf     SQS queues
api.tf        API Lambda and API Gateway
worker.tf     Inference worker on EC2
suggest.tf    Bedrock suggestion Lambda
frontend.tf   Frontend on S3 and CloudFront

### 7. Wrote a decision record
Docs/decisions/00-tooling-and-state.md records the problem, the options I rejected (local state only, a self-creating backend, DynamoDB locking, CDK), what I chose, and what would make me change it. The two likely triggers are working with a team, where I'd move to IAM Identity Center with short-lived credentials, and needing several environments, where I'd use one state key per environment.

## How the pieces fit together
The repository now looks like this for infrastructure:

```
.gitignore                    ignores state, plugins and tfvars
infra/
  bootstrap/
    main.tf                   creates the state bucket (local state)
    .terraform.lock.hcl       pinned provider versions
  backend.tf                  versions + "keep my state in S3"
  providers.tf                region + default tags
  network.tf ... frontend.tf  placeholders for what comes next
  .terraform.lock.hcl         pinned provider versions
Docs/decisions/
  00-tooling-and-state.md     why it was set up this way
```

When I run Terraform in `infra/`, it signs in to AWS with the CLI credentials from `~/.aws`, reads its state from the bucket, takes a lock while it works, and tags whatever it creates with `project=sightx`. The bootstrap folder isn't touched again unless the bucket itself needs changing.

The bucket is still empty. The main stack writes `main/terraform.tfstate` only on its first `terraform apply`, which happens when the first real infrastructure is added.

## Things to remember
- **Never run `terraform destroy` inside `infra/bootstrap/`.** Deleting the bucket throws away the main stack's state. Tearing infrastructure down is done from `infra/` only.
- **If `infra/bootstrap/terraform.tfstate` is ever lost, the bucket is still fine.** Run `terraform import aws_s3_bucket.tfstate sightx-tfstate-142366489647` from `infra/bootstrap/`, and import its versioning, encryption and public-access settings the same way.
- **Never paste the access key or secret** into chat, files or commits. To rotate it, go to IAM → Users → `sightx-bibeshT` → Security credentials.
- **`terraform apply` and `destroy` change real resources and can cost money.** `init`, `fmt`, `validate` and `plan` are safe to run any time.
- **Every CloudWatch log group gets 7-day retention.** By default AWS keeps logs forever and charges to store them.

## Left for later, on purpose
The IAM roles for the individual services (migrate, admin, API, worker and suggest) don't exist yet. Each one is created alongside the service that first needs it, so its permissions can point at real resource ARNs instead of wildcards. The Bedrock model is also not chosen yet.

## Commit history on this branch
- 13:21, `ed14483`: added `CLAUDE.md` to `.gitignore`
- 14:38, `dfb1a6b`: ignored Terraform state, plugins and tfvars
- 15:06, `4acaf08`: added the bootstrap `main.tf` and its lock file
- 15:22, `0055ca1`: added the main stack (`backend.tf`, `providers.tf`, placeholders, lock file)
- 15:40, `f137bd1`: added the decision record
- 15:45, `8cec32e`: corrected the IAM user name and added the Bedrock finding to the decision record
