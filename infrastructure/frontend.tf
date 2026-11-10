# Step 9: Frontend on S3 and CloudFront
# The built React app (frontend/dist) lives in a private bucket that only
# this CloudFront distribution can read (Origin Access Control). Every
# unknown path returns index.html so React Router handles /dashboard etc.
#
# Deploy (after `terraform output -raw api_url` is in frontend/.env.local):
#   cd frontend && npm ci && npm run build
#   aws s3 sync dist "s3://$(terraform output -raw frontend_bucket)" --delete
#   aws cloudfront create-invalidation \
#     --distribution-id "$(terraform output -raw frontend_distribution_id)" --paths "/index.html"
#
# Cost: CloudFront's always-free tier covers 1 TB and 10M requests a
# month; the bucket holds a few MB.

resource "aws_s3_bucket" "frontend" {
  bucket = "sightx-frontend-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "sightx-frontend" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── CloudFront ───────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "sightx-frontend"
  description                       = "CloudFront reads the private frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  frontend_origin_id = "sightx-frontend-s3"

  # AWS managed policies (IDs are fixed across accounts)
  cache_policy_caching_optimized   = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  response_headers_security_policy = "67f7725c-6f97-4210-82d7-5512b31e9d03" # HSTS, nosniff, frame-options, ...
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "SightX trial frontend"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # North America and Europe edges only: cheapest
  http_version        = "http2and3"

  origin {
    origin_id                = local.frontend_origin_id
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id           = local.frontend_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.cache_policy_caching_optimized
    response_headers_policy_id = local.response_headers_security_policy
  }

  # Single-page app: S3 answers 403 for keys that do not exist (the bucket
  # is private), so both codes fall back to index.html with a 200
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # *.cloudfront.net, no custom domain
  }

  tags = { Name = "sightx-frontend" }
}

# Only this distribution may read the bucket
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn } }
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.frontend.arn, "${aws_s3_bucket.frontend.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}
