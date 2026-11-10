# Tunables shared by more than one step. Defaults suit the trial; override
# in a gitignored terraform.tfvars.

variable "max_receive_count" {
  description = "Deliveries of a scan message before it moves to the dead-letter queue. The worker's MAX_RECEIVE_COUNT is set from this, so its last attempt marks the job failed."
  type        = number
  default     = 3

  validation {
    condition     = var.max_receive_count >= 1 && var.max_receive_count <= 10
    error_message = "max_receive_count must be between 1 and 10."
  }
}

variable "job_visibility_timeout_seconds" {
  description = "How long a received message stays hidden while the worker grades it: TTA inference plus the Bedrock call (up to 2 x 30 s). Must exceed the slowest job, or SQS redelivers it mid-run."
  type        = number
  default     = 300
}

variable "scan_retention_days" {
  description = "Days an uploaded scan image is kept in S3. Job rows (results, decisions) stay in Postgres."
  type        = number
  default     = 7
}

variable "dev_origins" {
  description = "Extra browser origins allowed to call the API and upload scans, e.g. the Vite dev server. The CloudFront domain is always allowed."
  type        = list(string)
  default     = ["http://localhost:5173"]
}
