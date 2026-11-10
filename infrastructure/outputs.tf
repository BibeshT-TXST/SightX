# Values later steps, migrations and the frontend build need.

output "db_endpoint" {
  description = "Postgres host name for DB_HOST"
  value       = aws_db_instance.main.address
}

output "db_master_secret_arn" {
  description = "Secrets Manager secret holding the master password (migrations only)"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "inference_queue_url" {
  description = "SQS queue the worker polls (INFERENCE_QUEUE_URL)"
  value       = aws_sqs_queue.inference.url
}

output "inference_dlq_url" {
  description = "Dead-letter queue for scans that failed every attempt"
  value       = aws_sqs_queue.inference_dlq.url
}

output "scans_bucket" {
  description = "Bucket receiving browser uploads (SCANS_BUCKET)"
  value       = aws_s3_bucket.scans.bucket
}

output "api_url" {
  description = "HTTP API base URL for the frontend build (VITE_API_URL)"
  value       = trimsuffix(aws_apigatewayv2_stage.default.invoke_url, "/")
}

output "worker_asg_name" {
  description = "Auto Scaling group of the worker; find its instance ID here for SSM sessions"
  value       = aws_autoscaling_group.worker.name
}

output "frontend_url" {
  description = "Public URL of the trial"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  description = "Bucket to sync frontend/dist into"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_distribution_id" {
  description = "CloudFront distribution to invalidate after a deploy"
  value       = aws_cloudfront_distribution.frontend.id
}
