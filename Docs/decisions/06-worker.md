### Problem:
Grading runs a 108-pass ResNet-50 ensemble on CPU (seconds to minutes per scan), then a Bedrock call. It needs SQS, S3, Bedrock and the private database, must recover from crashes without anyone watching, and should be cheap to run all month

### Options Rejected:
- Container Lambda for inference (the original V2 plan): 15-minute limit, no GPU, multi-GB image cold starts, and 108 passes on Lambda CPU is slow and expensive per scan
- A separate suggestion Lambda: inside the VPC it would need a Bedrock interface endpoint (~$7.30/month per AZ); outside it could not read the database
- Worker in a private subnet: needs a NAT gateway (~$33/month) or several interface endpoints
- Docker image in ECR: building an arm64 image on an x86 laptop needs emulation (slow), Docker was not reliably available locally, and ECR storage costs money
- A bare instance without an Auto Scaling group: nothing replaces it when it fails
- Larger or GPU instances: far beyond a student budget for a trial

### Choice:
- EC2 `t4g.small` (Graviton) in the public subnet: public IPv4, no inbound rules, same AZ as RDS
- Auto Scaling group of exactly one: replaces a failed instance; a changed launch template rolls a fresh instance (old one first, jobs wait in SQS)
- No image: at first boot the instance clones the public repo at `worker_git_ref`, installs CPU-only torch and `requirements-worker.txt` into a venv, adds 2 GiB swap, and runs `worker.py` as a non-root systemd service that restarts on crash. `sightx-update` deploys new commits on the same ref
- The worker also calls Bedrock (Amazon Nova Micro via the `us.` cross-region profile, the cheapest text model) with only dates, tiers and decisions; failures leave the job graded
- TTA passes are batched (4 per forward pass on 2 GiB) and the model is built without downloading ImageNet weights
- Role: receive/delete on the inference queue, read `scans/*`, `rds-db:connect` as `sightx_worker`, `bedrock:InvokeModel` on the profile and the model in its three US regions, SSM. IMDSv2 only, no SSH key
- Cost: ~$17.25/month (instance ~$12.30, 16 GB gp3 ~$1.30, public IPv4 ~$3.65)

## What could change in the future:
- Spot instances (~70% cheaper; interruptions are already safe because SQS redelivers)
- Scaling to zero when the queue is empty, at the cost of a few minutes' cold start per first scan
- A private subnet with a NAT gateway or interface endpoints for a real deployment
- Fewer TTA passes if accuracy holds, to cut time per scan
