# Building the network: VPC, subnets, route tables and security groups
**Branch:** `feature/vpc-network`
**Date:** 4 to 5 October 2026, roughly 23:00 to 00:20
**Region:** `us-east-2` (Ohio)
**AWS account:** `142366489647`

This is the first real infrastructure for SightX on AWS. By the end of the session the account had a private network (a VPC) with one public subnet for the future inference worker, two private subnets for the future database and Lambdas, the routing that decides which of them can reach the internet, a free private path to S3, and the four firewalls (security groups) that later steps attach to their resources. Nothing that runs code exists yet, so this step costs $0 a month.

## What I did, in order
### 1. Created a branch and decided the layout
I branched `feature/vpc-network` off `main` after the Step 0 PR (#28) was merged. The layout follows the plan's cheapest design that still keeps the database private:

| Piece | Setting |
| --- | --- |
| VPC | `10.0.0.0/16`, DNS support and DNS hostnames on |
| `public-a` | `10.0.0.0/24`, `us-east-2a`, public IPv4 assigned at launch |
| `private-a` | `10.0.10.0/24`, `us-east-2a` |
| `private-b` | `10.0.11.0/24`, `us-east-2b` |

There is no NAT gateway. A NAT gateway would let private subnets reach the internet, but it costs about $0.045 an hour (around $32.85 a month) whether or not anything uses it. Instead, the EC2 worker will sit in the public subnet with a public IP and no inbound rules, which costs about $3.65 a month once the instance exists in Step 7.

### 2. Wrote the VPC and the three subnets
A VPC is my own isolated network inside AWS. `10.0.0.0/16` gives it 65,536 private addresses that exist only inside it. The two DNS flags turn on AWS's built-in resolver for the VPC. `enable_dns_hostnames` matters later: in Step 8 it lets the Bedrock endpoint's private DNS name resolve to an address inside the VPC.

A subnet is a slice of the VPC that lives in one Availability Zone (AZ), a physically separate data centre. Each `/24` holds 256 addresses, of which AWS reserves 5. There are two private subnets in two AZs because an RDS DB subnet group must span at least two AZs, even for a single-AZ database. I typed the AZ names into a `locals` block rather than looking them up, because it is easier to read and the region is already fixed in `providers.tf`. A read-only `describe-availability-zones` confirmed `us-east-2a`, `2b` and `2c` are all available on this account.

Nothing in a subnet's own settings makes it public or private. The route table does.

### 3. Added the internet gateway and the two route tables
The internet gateway is the VPC's door to the internet. It is free, and it does nothing until a route table points at it.

A route table is a list of rules for where traffic leaving a subnet goes. AWS picks the most specific matching rule. Every table has an automatic `local` route (`10.0.0.0/16 → local`) that lets all subnets in the VPC reach each other.

- **Public route table (`sightx-public-rt`):** `0.0.0.0/0 → internet gateway`, associated with `public-a`. "Anything not inside the VPC goes to the internet."
- **Private route table (`sightx-private-rt`):** only the local route, associated with `private-a` and `private-b`. A packet for the internet matches nothing and is dropped. That is what makes these subnets private.

**Adopting the main route table.** Every new VPC comes with a "main" route table that AWS creates automatically, and any subnet without an explicit association falls back to it. If I had created the private table as a normal `aws_route_table`, the VPC would have three route tables: my two, plus an untracked main table that still decides where forgotten subnets send their traffic. Instead I used `aws_default_route_table`, which does not create anything. It takes over the existing main table, removes any non-local routes, and manages it as the private table. That gives three benefits:

- The VPC has exactly two route tables, which is what the plan's check expects.
- Every route table is described in code.
- A subnet I forget to associate in a later step lands on the table with no internet route. It breaks loudly instead of quietly ending up on the internet. In other words, it fails closed.

On `terraform destroy`, Terraform cannot delete a main route table, so it only drops it from state, and deleting the VPC removes it.

### 4. Added the S3 gateway endpoint
A gateway endpoint adds a route to a route table from S3's published IP ranges (a prefix list, `pl-...`) to the endpoint (`vpce-...`). Private Lambdas can then reach S3 without any internet route, and the traffic stays on AWS's network. S3 gateway endpoints are free, with no hourly or per-GB charge. I attached it to both route tables, so the worker's S3 traffic (scan images and the ~99 MB model weights) also uses it.

### 5. Added the security groups
A security group is a firewall attached to a resource's network interface. Two properties matter:

- **It is stateful.** If inbound traffic is allowed, the reply is allowed out automatically. That is why the database group needs no outbound rules even though it answers queries.
- **Rules only allow.** There is no deny. Anything not allowed is dropped.

| Group | Inbound | Outbound | Used from |
| --- | --- | --- | --- |
| `sightx-lambda` | none | all | Lambdas in the VPC (Steps 2, 3, 6, 8) |
| `sightx-worker` | none, not even SSH | all | EC2 worker (Step 7), reached with SSM Session Manager |
| `sightx-rds` | TCP 5432 from `sightx-lambda` and `sightx-worker` | none | RDS (Step 3) |
| `sightx-endpoints` | TCP 443 from `sightx-lambda` | none | Bedrock interface endpoint (Step 8) |

The inbound rules point at another security group's ID instead of an IP range. "Allow port 5432 from anything carrying `sightx-lambda`" stays correct even though Lambda IP addresses change all the time. Each rule is its own `aws_vpc_security_group_ingress_rule` or `egress_rule` resource, which is the style the AWS provider docs recommend over inline blocks. When Terraform creates a security group, it removes AWS's default "allow all outbound" rule, so `sightx-rds` and `sightx-endpoints` really have no outbound rules.

The plan calls the groups `sg-lambda`, `sg-worker` and so on. AWS does not allow security group names that start with `sg-`, because that prefix is reserved for IDs, so they are named `sightx-*` instead.

**Locking down the default security group.** Every VPC also gets a security group called `default` that cannot be deleted. It allows all traffic between its members and all outbound traffic. Several AWS services attach it automatically when no group is named. For example, if the security group line were missing from the RDS instance in Step 3, the database would get `default` and still work, with nothing warning me. I adopted it with `aws_default_security_group` and gave it no rules. Terraform strips every existing rule on adoption, so a resource that ends up with this group has no network access at all and the mistake is obvious. This matches AWS Security Hub control EC2.2 (from the CIS AWS Foundations Benchmark): "VPC default security groups should not allow inbound or outbound traffic."

I left the default network ACL alone. It allows everything, and it is stateless, so tightening it would mean opening return ports (1024 to 65535) by hand. The security groups already enforce the rules.

### 6. Planned and applied
In `infra/`, `terraform validate` succeeded and `terraform plan` showed **21 to add, 0 to change, 0 to destroy**. The two `aws_default_*` resources show as "will be created" in the plan. That is how Terraform displays an adoption; AWS does not create a new table or group. I ran `terraform apply` at about 00:08. This was the main stack's first apply, so it also wrote `main/terraform.tfstate` into the state bucket for the first time.

### 7. Ran the check
The plan's check is that the VPC has three subnets and two route tables, and the private route table has no `0.0.0.0/0` route. Read-only AWS CLI calls against `vpc-04643d9fb0d8d839f` showed:

```
Subnets
sightx-private-a   10.0.10.0/24   us-east-2a   public IP: False
sightx-private-b   10.0.11.0/24   us-east-2b   public IP: False
sightx-public-a    10.0.0.0/24    us-east-2a   public IP: True

Route tables (second column = is main)
sightx-public-rt    0
sightx-private-rt   1

Routes in sightx-private-rt
10.0.0.0/16    local
pl-7ba54012    vpce-07b8d9a2814b6b19e   (S3 endpoint)

Security groups (name, inbound rules, outbound rules)
default            0  0
sightx-lambda      0  1
sightx-worker      0  1
sightx-rds         1  0   (two sources in one permission)
sightx-endpoints   1  0
```

`sightx-private-rt` is the main table, which proves the adoption worked, and it has no `0.0.0.0/0` route. A follow-up `terraform plan` reported "No changes", so the code and AWS agree.

### 8. Wrote a decision record
`Docs/decisions/01-vpc-networking.md` records the problem, the options I rejected (a NAT gateway, a private worker with paid interface endpoints, leaving the main route table and default security group unmanaged, IP-based rules, managing the network ACL), what I chose, and what would make me change it. The main trigger is a real hospital deployment, where security outweighs a small monthly cost and the worker would move to a private subnet behind a NAT gateway or interface endpoints.

## How the pieces fit together
```
VPC 10.0.0.0/16  (sightx-vpc)
├── public-a   10.0.0.0/24   us-east-2a ── sightx-public-rt
│                                           ├── 10.0.0.0/16 → local
│                                           ├── 0.0.0.0/0   → internet gateway
│                                           └── S3 prefix   → S3 endpoint
├── private-a  10.0.10.0/24  us-east-2a ─┐
├── private-b  10.0.11.0/24  us-east-2b ─┴ sightx-private-rt (main table)
│                                           ├── 10.0.0.0/16 → local
│                                           └── S3 prefix   → S3 endpoint
└── security groups: sightx-lambda, sightx-worker, sightx-rds, sightx-endpoints,
                     default (no rules)
```

Who will be able to talk to whom once later steps attach these groups:

- A Lambda in a private subnet can reach RDS on 5432, S3 through the endpoint, and (from Step 8) Bedrock through the interface endpoint. It cannot reach the internet.
- The worker in the public subnet can reach the internet over HTTPS for SQS and other AWS APIs, RDS on 5432 and S3 through the endpoint. Nothing can open a connection to it.
- RDS accepts connections only from the Lambda and worker groups.

## Things to remember
- **A Lambda in a VPC never gets a public IP**, even in a public subnet. Private Lambdas can reach only the VPC and its endpoints, which is why the S3 endpoint exists and why Step 8 adds a Bedrock endpoint.
- **Every new subnet needs an explicit route table association.** Without one it falls back to the private table and has no internet.
- **Attach a named security group to every resource** in later steps. The default group now blocks everything.
- **The worker's public IP starts costing money in Step 7**, when the instance exists. Today the network costs nothing.
- **`terraform fmt -check` fails on `network.tf`.** The committed file uses 4-space indents in places and has no trailing newline. Run `terraform fmt` in `infra/` and commit the result; it changes whitespace only.

## Left for later, on purpose
The Bedrock Runtime interface endpoint is created in Step 8, in `private-a` only. It bills hourly, so it waits until the Suggest Lambda exists. Only its security group (`sightx-endpoints`) exists now. The DB subnet group that uses `private-a` and `private-b` comes with RDS in Step 3.

## Commit history on this branch
- 4 Oct 23:05, `e9f08c7`: added the AZ `locals` (two AZs, because an RDS subnet group must span two)
- 4 Oct 23:24, `8ff0f9b`: added the VPC, `public-a`, `private-a` and `private-b`
- 4 Oct 23:38, `f0edbb5`: added the internet gateway and the route tables
- 4 Oct 23:41, `7aaf3cf`: added the S3 gateway endpoint on both route tables
- 5 Oct 00:00, `5f2c58c`: added the security groups and their rules
- 5 Oct 00:19, `623435d`: added the decision record
