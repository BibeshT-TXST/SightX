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

# ── API abuse limits (the trial has no sign-in, so these are the guard) ──────

variable "api_rate_limit" {
  description = "Steady-state requests per second the HTTP API accepts across all callers; extra requests get 429."
  type        = number
  default     = 10
}

variable "api_burst_limit" {
  description = "Requests the HTTP API accepts in a short burst above the rate limit."
  type        = number
  default     = 20
}

variable "api_reserved_concurrency" {
  description = "Concurrent API Lambda executions, which also caps Postgres connections (one per instance). -1 leaves it unreserved: new accounts often have a 10-execution account limit, and reserving any of it then fails. Set e.g. 5 once Service Quotas shows 1000."
  type        = number
  default     = -1
}

# ── Inference worker ─────────────────────────────────────────────────────────

variable "worker_instance_type" {
  description = "EC2 type for the worker. Graviton (t4g) is cheapest; x86 types also work (the AMI follows the architecture)."
  type        = string
  default     = "t4g.small"
}

variable "worker_git_url" {
  description = "Public repository the worker installs itself from."
  type        = string
  default     = "https://github.com/BibeshT-TXST/SightX.git"
}

variable "worker_git_ref" {
  description = "Branch or tag the worker runs. Changing it replaces the instance."
  type        = string
  default     = "main"
}

variable "worker_tta_passes" {
  description = "TTA passes per scan (TTA_PASSES). Fewer is faster and cheaper on CPU."
  type        = number
  default     = 108
}

variable "worker_tta_batch_size" {
  description = "Passes per forward pass (TTA_BATCH_SIZE). 4 keeps a 2 GiB instance within memory."
  type        = number
  default     = 4
}

variable "bedrock_model_id" {
  description = "Bedrock model or US cross-region inference profile for suggestions (BEDROCK_MODEL_ID)."
  type        = string
  default     = "us.amazon.nova-micro-v1:0"

  validation {
    condition     = startswith(var.bedrock_model_id, "us.")
    error_message = "Use a US cross-region inference profile ID (us.<model-id>); the worker's IAM policy is written for one."
  }
}
