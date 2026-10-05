# VPC and networking
# One public subnet for the EC2 worker, two private subnets for RDS and 
# the Lamndas, no NAT gatweay. Private subnets have no route to the internet

locals {
    # Two Availability Zones (AZs) because RDS subnet group must span
    # two, even for one instance
    azs = ["us-east-2a", "us-east-2b"]
}
