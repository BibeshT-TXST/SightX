# VPC and networking
# One public subnet for the EC2 worker, two private subnets for RDS and 
# the Lamndas, no NAT gatweay. Private subnets have no route to the internet

locals {
    # Two Availability Zones (AZs) because RDS subnet group must span
    # two, even for one instance
    azs = ["us-east-2a", "us-east-2b"]
}

# ----------------------------
# VPC and subnets
# ----------------------------

resource "aws_vpc" "main" {
    cidr_block              = "10.0.0.0/16"
    enable_dns_support      = true  # the VPC's DNS resolver answers queries
    enable_dns_hostnames    = true  # needed for private DNS on the Bedrock endpoint

    tags = { Name = "sightx-vpc" }
}

resource "aws_subnet" "public_a" {
    vpc_id                  = aws_vpc.main.id
    cidr_block              = "10.0.0.0/24"
    availability_zone       = local.azs[0]
    map_public_ip_on_launch = true  # the worker gets a public IPv4 to reach  AWS APIs"

    tags = { Name = "sightx-public-a" }
}

resource "aws_subnet" "private_a" {
    vpc_id                  = aws_vpc.main.id
    cidr_block              = "10.0.10.0/24"
    availability_zone       = local.azs[0]

    tags = { Name = "sightx-private-a" }
}

resource "aws_subnet" "private_b" {
    vpc_id                  = aws_vpc.main.id
    cidr_block              = "10.0.11.0/24"
    availability_zone       = local.azs[1]

    tags = { Name = "sightx-private-b" }
}