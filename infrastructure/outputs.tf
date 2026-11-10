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
