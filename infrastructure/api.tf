# Step 6: API Lambda and API Gateway
# An HTTP API (cheaper than a REST API: $1 vs $3.50 per million requests)
# in front of one Node.js Lambda in the private subnets. The Lambda only
# talks to RDS and signs S3 uploads locally, so it needs no internet route.
# There is no authorizer (open trial): stage throttling is the guard.
#
# Build first: the package is zipped from api/ as it is on disk, so run
#   cd api && npm ci --omit=dev
# before terraform plan/apply. Rebuilding changes the hash and redeploys.
#
# Cost at trial volume: ~$0 (Lambda and HTTP API free tiers / pennies).

data "aws_region" "current" {}

# ── Deployment package ───────────────────────────────────────────────────────

data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../api"
  output_path = "${path.module}/build/api.zip"

  # Runtime needs src/, node_modules/ and package.json ("type": "module")
  excludes = ["test", "test/**", ".gitignore", "package-lock.json", "*.zip"]
}

# ── IAM ──────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "api" {
  name = "sightx-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Network interfaces in the VPC, and writing CloudWatch logs
resource "aws_iam_role_policy_attachment" "api_vpc" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "api" {
  name = "sightx-api"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # IAM auth token for the sightx_api database role only
        Sid      = "ConnectAsApiRole"
        Effect   = "Allow"
        Action   = "rds-db:connect"
        Resource = "arn:aws:rds-db:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.main.resource_id}/sightx_api"
      },
      {
        # Presigned POSTs carry this role's permission: uploads to scans/ only
        Sid      = "PresignScanUploads"
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.scans.arn}/scans/*"
      },
    ]
  })
}

# ── Lambda ───────────────────────────────────────────────────────────────────

# Created up front so logs expire instead of accumulating forever
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/sightx-api"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name = "sightx-api"
  role          = aws_iam_role.api.arn

  runtime       = "nodejs22.x"
  architectures = ["arm64"] # Graviton: ~20% cheaper per GB-second
  handler       = "src/handler.handler"

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  memory_size                    = 256
  timeout                        = 10
  reserved_concurrent_executions = var.api_reserved_concurrency

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST      = aws_db_instance.main.address
      DB_NAME      = aws_db_instance.main.db_name
      DB_USER      = "sightx_api"
      SCANS_BUCKET = aws_s3_bucket.scans.bucket
      # Node 20+ runtimes no longer trust the RDS CA by default
      NODE_EXTRA_CA_CERTS = "/var/runtime/ca-cert.pem"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.api,
    aws_iam_role_policy_attachment.api_vpc,
  ]
}

# ── HTTP API ─────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "main" {
  name          = "sightx-api"
  protocol_type = "HTTP"

  # API Gateway answers preflights and adds CORS headers to responses
  cors_configuration {
    allow_origins = local.frontend_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "x-trial-session"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

# Must match the route keys in api/src/routes.js
resource "aws_apigatewayv2_route" "api" {
  for_each = toset([
    "POST /scans",
    "GET /jobs",
    "GET /jobs/{id}",
    "POST /jobs/{id}/decision",
  ])

  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # Account-wide guard for an API anyone can call: excess requests get 429
  default_route_settings {
    throttling_rate_limit  = var.api_rate_limit
    throttling_burst_limit = var.api_burst_limit
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowHttpApiInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
