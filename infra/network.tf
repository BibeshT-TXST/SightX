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