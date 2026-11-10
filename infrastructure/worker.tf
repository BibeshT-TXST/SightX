# Step 7: Inference worker on EC2
# One instance in the public subnet (public IPv4, no inbound rules) that
# long-polls the inference queue, grades scans and asks Bedrock for a
# suggestion. It installs itself from the public GitHub repo at boot (see
# files/worker-user-data.sh.tftpl): no Docker image, no ECR.
#
# An Auto Scaling group of exactly one replaces the instance if it fails
# its EC2 health checks, and rolls a fresh one whenever the launch template
# changes (new git ref, instance type, settings). Jobs wait in SQS meanwhile.
#
# Access: SSM Session Manager only (no SSH key, no port 22).
# Deploy new commits on the same ref: run `sudo sightx-update` over SSM.
#
# Cost (t4g.small, us-east-2): ~$12.30 instance + ~$1.30 16 GB gp3 +
# ~$3.65 public IPv4 = ~$17/month while running.

# ── AMI: latest Amazon Linux 2023 for the instance type's architecture ───────

data "aws_ec2_instance_type" "worker" {
  instance_type = var.worker_instance_type
}

locals {
  worker_arch = contains(data.aws_ec2_instance_type.worker.supported_architectures, "arm64") ? "arm64" : "x86_64"

  # The "us." cross-region inference profile may serve a request from any
  # of these regions, so the role needs the model in all of them
  bedrock_profile_regions = ["us-east-1", "us-east-2", "us-west-2"]
  bedrock_model_id        = trimprefix(var.bedrock_model_id, "us.")
}

data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-${local.worker_arch}"
}

# ── IAM ──────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "worker" {
  name = "sightx-worker"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Session Manager shell access in place of SSH
resource "aws_iam_role_policy_attachment" "worker_ssm" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "worker" {
  name = "sightx-worker"
  role = aws_iam_role.worker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ConsumeInferenceQueue"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueAttributes",
        ]
        Resource = aws_sqs_queue.inference.arn
      },
      {
        Sid      = "ReadUploadedScans"
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.scans.arn}/scans/*"
      },
      {
        Sid      = "ConnectAsWorkerRole"
        Effect   = "Allow"
        Action   = "rds-db:connect"
        Resource = "arn:aws:rds-db:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.main.resource_id}/sightx_worker"
      },
      {
        # Converse calls go through the inference profile to the model
        Sid    = "InvokeSuggestionModel"
        Effect = "Allow"
        Action = "bedrock:InvokeModel"
        Resource = concat(
          ["arn:aws:bedrock:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.bedrock_model_id}"],
          [for r in local.bedrock_profile_regions : "arn:aws:bedrock:${r}::foundation-model/${local.bedrock_model_id}"],
        )
      },
    ]
  })
}

resource "aws_iam_instance_profile" "worker" {
  name = "sightx-worker"
  role = aws_iam_role.worker.name
}

# ── Launch template ──────────────────────────────────────────────────────────

resource "aws_launch_template" "worker" {
  name                   = "sightx-worker"
  image_id               = data.aws_ssm_parameter.al2023_ami.insecure_value
  instance_type          = var.worker_instance_type
  update_default_version = true

  iam_instance_profile {
    arn = aws_iam_instance_profile.worker.arn
  }

  network_interfaces {
    associate_public_ip_address = true # reaches SQS, S3, Bedrock and GitHub without a NAT gateway
    security_groups             = [aws_security_group.worker.id]
  }

  # IMDSv2 only, one hop: the instance role cannot be read by anything
  # forwarding requests from outside the host
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 16 # OS + repo + torch + 2 GiB swap
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/files/worker-user-data.sh.tftpl", {
    git_url              = var.worker_git_url
    git_ref              = var.worker_git_ref
    stop_timeout_seconds = var.job_visibility_timeout_seconds + 30
    worker_env = {
      AWS_REGION          = data.aws_region.current.region
      INFERENCE_QUEUE_URL = aws_sqs_queue.inference.url
      MAX_RECEIVE_COUNT   = var.max_receive_count
      DB_HOST             = aws_db_instance.main.address
      DB_NAME             = aws_db_instance.main.db_name
      DB_USER             = "sightx_worker"
      DB_SSLMODE          = "require"
      BEDROCK_MODEL_ID    = var.bedrock_model_id
      TTA_PASSES          = var.worker_tta_passes
      TTA_BATCH_SIZE      = var.worker_tta_batch_size
    }
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "sightx-worker", project = "sightx" }
  }

  tag_specifications {
    resource_type = "volume"
    tags          = { Name = "sightx-worker", project = "sightx" }
  }
}

# ── Auto Scaling group of one ────────────────────────────────────────────────

resource "aws_autoscaling_group" "worker" {
  name                = "sightx-worker"
  min_size            = 1
  max_size            = 1
  desired_capacity    = 1
  vpc_zone_identifier = [aws_subnet.public_a.id] # same AZ as RDS

  health_check_type         = "EC2"
  health_check_grace_period = 600 # first boot installs torch

  launch_template {
    id      = aws_launch_template.worker.id
    version = aws_launch_template.worker.latest_version
  }

  # A changed launch template replaces the instance. With one instance
  # there is nothing to keep healthy, so the old one goes first; queued
  # jobs simply wait a few minutes.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 0
    }
  }

  tag {
    key                 = "Name"
    value               = "sightx-worker"
    propagate_at_launch = true
  }

  depends_on = [aws_iam_role_policy.worker, aws_iam_role_policy_attachment.worker_ssm]
}
