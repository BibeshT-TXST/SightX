# Step 3: RDS PostgreSQL
# One small, private, single-AZ Postgres instance. The API Lambda and the
# worker log in as sightx_api / sightx_worker with IAM auth tokens, so no
# app password exists anywhere. The master password is generated and kept
# in Secrets Manager by RDS, and is only used to run db/migrations.
#
# Cost (us-east-2, on-demand): db.t4g.micro ~$11.70/month, 20 GB gp3
# ~$2.30/month, master secret ~$0.40/month. Backups up to the database's
# size are free. Stop the instance between demos to pay for storage only
# (AWS starts it again after 7 days).

resource "aws_db_subnet_group" "main" {
  name        = "sightx-db"
  description = "Private subnets for SightX Postgres"
  # RDS requires subnets in two AZs even for a single-AZ instance
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = { Name = "sightx-db" }
}

resource "aws_db_instance" "main" {
  identifier = "sightx-db"

  # Engine: major version only, so RDS applies minor patches automatically
  engine                     = "postgres"
  engine_version             = "16"
  auto_minor_version_upgrade = true
  instance_class             = "db.t4g.micro" # 2 vCPU burstable, 1 GiB, Graviton

  # Storage: smallest gp3 size, encrypted with the AWS-managed key (no KMS
  # key charge). No storage autoscaling, so the bill cannot grow silently.
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  # Credentials: master password generated and stored by RDS; apps use IAM
  db_name                             = "sightx"
  username                            = "sightx_admin"
  manage_master_user_password         = true
  iam_database_authentication_enabled = true

  # Network: private subnets only, reachable from the Lambda and worker
  # security groups (network.tf). Same AZ as the worker's public subnet,
  # so worker-to-database traffic stays in one AZ (no cross-AZ charges).
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false
  availability_zone      = local.azs[0]

  # Backups and protection: 7 days of point-in-time recovery, a final
  # snapshot on delete, and deletion protection (set it to false and apply
  # before a deliberate terraform destroy)
  backup_retention_period   = 7
  copy_tags_to_snapshot     = true
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "sightx-db-final"

  # Paid extras left off
  performance_insights_enabled = false
  monitoring_interval          = 0

  # Changes that need a restart wait for the maintenance window
  apply_immediately = false

  tags = { Name = "sightx-db" }
}
