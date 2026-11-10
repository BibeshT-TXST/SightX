# Monitoring
# Budget alerts are managed outside Terraform. This adds the one signal
# they cannot give: a scan that failed every attempt and now sits in the
# dead-letter queue. The alarm notifies an existing SNS topic and is only
# created when alarm_sns_topic_arn is set.
#
# Cost: $0 (within CloudWatch's 10 free standard alarms).

resource "aws_cloudwatch_metric_alarm" "inference_dlq_not_empty" {
  count = var.alarm_sns_topic_arn == "" ? 0 : 1

  alarm_name        = "sightx-inference-dlq-not-empty"
  alarm_description = "A scan failed every attempt and is in ${aws_sqs_queue.inference_dlq.name}. Check the worker log (journalctl -u sightx-worker), fix, then redrive from the SQS console."

  namespace   = "AWS/SQS"
  metric_name = "ApproximateNumberOfMessagesVisible"
  dimensions  = { QueueName = aws_sqs_queue.inference_dlq.name }

  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching" # SQS stops reporting idle queues

  # Notify on failure and again once the queue is cleared
  alarm_actions = [var.alarm_sns_topic_arn]
  ok_actions    = [var.alarm_sns_topic_arn]
}
