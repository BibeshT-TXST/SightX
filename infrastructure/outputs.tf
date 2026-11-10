# Values later steps, migrations and the frontend build need.

output "db_endpoint" {
  description = "Postgres host name for DB_HOST"
  value       = aws_db_instance.main.address
}

output "db_master_secret_arn" {
  description = "Secrets Manager secret holding the master password (migrations only)"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}
