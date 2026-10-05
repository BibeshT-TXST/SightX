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

# ---------------------------------
# Internet gatway and route tables
# ---------------------------------

resource "aws_internet_gateway" "main" {
    vpc_id = aws_vpc.main.id

    tags = { Name = "sightx-igw"}
}

resource "aws_route_table" "public" {
    vpc_id = aws_vpc.main.id

    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.main.id 
    }

    tags = { Name = "sightx-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

# AWS creates a "main" route table with every VPC. Adopting it as the private
# table keeps the VPC at two route tables, and any subnet left unassociated
# falls back to this one, which has no internet route. No route blocks: only
# the implicit local route (10.0.0.0/16) remains.
resource "aws_default_route_table" "private" {
  default_route_table_id = aws_vpc.main.default_route_table_id

  tags = { Name = "sightx-private-rt" }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_default_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_default_route_table.private.id
}

# ----------------------------------------------------------------
# S3 gateway endpoint: private path to S3 from both route tables
# ----------------------------------------------------------------

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-2.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [
    aws_route_table.public.id,
    aws_default_route_table.private.id,
  ]

  tags = { Name = "sightx-s3-endpoint" }
}

# ------------------
# Security groups
# ------------------

# Strip every rule from the VPC's default security group so nothing can use it 
resource "aws_default_security_group" "default" {
    vpc_id = aws_vpc.main.id

    tags = { Name = "sightx-default-unused" }
}

resource "aws_security_group" "lambda" {
    name            = "sightx-lambda"
    description     = "VPC Lambdas: no inbound, all outbound"
    vpc_id          = aws_vpc.main.id

    tags = { Name = "sightx-lambda" }
}

resource "aws_security_group" "worker" {
    name            = "sightx-worker"
    description     = "EC2 inference worker: no inbound, all outbound"
    vpc_id          = aws_vpc.main.id

    tags = { Name = "sightx-worker" }
}

resource "aws_security_group" "rds" {
  name        = "sightx-rds"
  description = "RDS: Postgres from Lambda and worker only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "sightx-rds" }
}

resource "aws_security_group" "endpoints" {
  name        = "sightx-endpoints"
  description = "Interface endpoints: HTTPS from Lambda only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "sightx-endpoints" }
}

# Outbound: Lambda and worker may reach anything
# RDS and endpoints get no outbound rules; security groups
# are stateful, so replies to allowed inbound traffic still go out.
resource "aws_vpc_security_group_egress_rule" "lambda_all" {
  security_group_id = aws_security_group.lambda.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # all protocols and ports
}

resource "aws_vpc_security_group_egress_rule" "worker_all" {
  security_group_id = aws_security_group.worker.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# Inbound: referenced by security group ID, never by IP range.
resource "aws_vpc_security_group_ingress_rule" "rds_from_lambda" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.lambda.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_worker" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.worker.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_from_lambda" {
  security_group_id            = aws_security_group.endpoints.id
  referenced_security_group_id = aws_security_group.lambda.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}