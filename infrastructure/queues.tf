# Step 5: SQS queues
# One inference queue fed by S3 ObjectCreated events (storage.tf), polled
# by the EC2 worker. Messages that fail max_receive_count times move to a
# dead-letter queue, where an alarm (monitoring) picks them up and they can
# be redriven after a fix.
#
# Cost: the first 1M requests a month are free; with 20 s long polling an
# idle worker makes ~130k requests a month.

resource "aws_sqs_queue" "inference_dlq" {
  name = "sightx-inference-dlq"

  # Keep failures long enough to inspect and redrive (the maximum)
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = { Name = "sightx-inference-dlq" }
}

resource "aws_sqs_queue" "inference" {
  name = "sightx-inference"

  visibility_timeout_seconds = var.job_visibility_timeout_seconds
  receive_wait_time_seconds  = 20     # long polling by default
  message_retention_seconds  = 345600 # 4 days: survives a long weekend with the worker off
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inference_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = { Name = "sightx-inference" }
}

# Only the inference queue may send to the dead-letter queue, and the
# console's "Start DLQ redrive" may move messages back to it
resource "aws_sqs_queue_redrive_allow_policy" "inference_dlq" {
  queue_url = aws_sqs_queue.inference_dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.inference.arn]
  })
}
