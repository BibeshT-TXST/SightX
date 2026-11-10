# Step 4: S3 buckets
# The scans bucket receives fundus images straight from the browser through
# presigned POSTs signed by the API Lambda. Every new object under scans/
# sends an ObjectCreated event to the inference queue, so the job row
# (written by the API first) always exists before the worker sees it.
#
# Cost: S3 Standard ~$0.023/GB-month; images expire after
# scan_retention_days, so storage stays near zero.

data "aws_caller_identity" "current" {}

locals {
  # Browser origins allowed to upload. Step 9 adds the CloudFront domain.
  frontend_origins = var.dev_origins
}

resource "aws_s3_bucket" "scans" {
  # Bucket names are global; the account ID keeps this one unique
  bucket = "sightx-scans-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "sightx-scans" }
}

# ── Lock it down ─────────────────────────────────────────────────────────────

resource "aws_s3_bucket_public_access_block" "scans" {
  bucket                  = aws_s3_bucket.scans.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ACLs disabled: the bucket owner owns every object, whoever uploads it
resource "aws_s3_bucket_ownership_controls" "scans" {
  bucket = aws_s3_bucket.scans.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# SSE-S3 (no KMS key charge)
resource "aws_s3_bucket_server_side_encryption_configuration" "scans" {
  bucket = aws_s3_bucket.scans.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Refuse any request that is not over TLS
resource "aws_s3_bucket_policy" "scans" {
  bucket = aws_s3_bucket.scans.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.scans.arn, "${aws_s3_bucket.scans.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.scans]
}

# ── Lifecycle and browser access ─────────────────────────────────────────────

resource "aws_s3_bucket_lifecycle_configuration" "scans" {
  bucket = aws_s3_bucket.scans.id

  rule {
    id     = "expire-trial-scans"
    status = "Enabled"
    filter {
      prefix = "scans/"
    }
    expiration {
      days = var.scan_retention_days
    }
  }
}

# The browser POSTs uploads directly to the bucket. The presigned policy
# still pins the key, content type and size; CORS only lets the page read
# S3's response.
resource "aws_s3_bucket_cors_configuration" "scans" {
  bucket = aws_s3_bucket.scans.id

  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = local.frontend_origins
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

# ── S3 → SQS notification ────────────────────────────────────────────────────

# Lets only this bucket, in this account, send events to the inference queue
resource "aws_sqs_queue_policy" "inference_from_s3" {
  queue_url = aws_sqs_queue.inference.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowScansBucketEvents"
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.inference.arn
      Condition = {
        ArnEquals    = { "aws:SourceArn" = aws_s3_bucket.scans.arn }
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

resource "aws_s3_bucket_notification" "scans" {
  bucket = aws_s3_bucket.scans.id

  queue {
    queue_arn     = aws_sqs_queue.inference.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "scans/"
  }

  # S3 sends a test event on save and fails if it is not allowed to yet
  depends_on = [aws_sqs_queue_policy.inference_from_s3]
}
