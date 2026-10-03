### Problem: 
Terraform state needs a durable, private, lockable home and a bucket that holds it cannot be created by the stack that uses it

### Options Rejected:
- local-state: lost with the pc, and cannot be shared
- one config that creates its own backend bucket(chicken and egg problem)
- DynamoDB locking: deprecated + extra resource
- AWS CDK: we are using Terraform for Infrastructure as Code (IAC)

### Choice: 
- A bootstrap config with local state → a versioned, encrypted, private S3 bucket with prevent_destroy 
- The main stack uses the S3 backend with use_lockfile
- Region us-east-2 
- A sightx-bibeshT IAM user for the CLI
- us-east-2 offers on-demand Bedrock text models (38 listed as of 2026-10-03)
- model chosen in later steps

## What could change in the future:
- If we are working with a team we would need to move to IAM Identity Center with short-lived credentials instead of an access key
- We would need multiple environemnts (one state key per environment)