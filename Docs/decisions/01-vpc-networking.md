### Problem:
The database and Lambdas must stay private, the inference worker must reach AWS APIs (SQS, S3, RDS), and the network should cost nothing while idle

### Options Rejected:
- NAT gateway for private egress: about $32.85/month before traffic, even when nothing runs
- Worker in a private subnet with interface endpoints for SQS, S3 and others: each interface endpoint bills hourly per AZ
- Leaving AWS's main route table unmanaged: a third, untracked route table that unassociated subnets would silently fall back to
- Leaving the default security group as-is: allows all traffic between its members and anything AWS attaches it to by default
- Security groups referenced by IP range: Lambda IPs change constantly
- Managing the default network ACL: stateless, would need ephemeral port rules, adds nothing over security groups here

### Choice:
- VPC 10.0.0.0/16, one public subnet (10.0.0.0/24, us-east-2a) for the worker, two private subnets (10.0.10.0/24 in 2a, 10.0.11.0/24 in 2b) for RDS and Lambdas
- No NAT. Public route table sends 0.0.0.0/0 to the internet gateway; private route table has the local route only
- The VPC's main route table is adopted (aws_default_route_table) as the private table, so a subnet without an association fails closed with no internet
- The default security group is adopted and stripped of all rules (Security Hub control EC2.2 / CIS)
- Free S3 gateway endpoint on both route tables
- Four security groups, rules reference groups by ID. Named sightx-* because AWS forbids names starting with "sg-"
- Cost of this step: $0/month

## What could change in the future:
- A hospital or production deployment would move the worker to a private subnet and pay for a NAT gateway or interface endpoints, as security is more important than a bit of the cost
in a real health care software
- Multi-AZ RDS or a second worker would need a public subnet in a second availability zone
