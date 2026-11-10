### Problem:
Fundus images are large, inference takes seconds to minutes on CPU, and several visitors may upload at once. Uploads must not go through Lambda (6 MB payload limit), work must survive a worker restart, and the job row must exist before the worker sees the image

### Options Rejected:
- Uploading through the API Lambda: 6 MB request limit, and paying Lambda time to move bytes
- The API Lambda sending to SQS: the private Lambda has no internet, so it would need an SQS interface endpoint (~$7.30/month per AZ)
- Sending the queue message from the browser or after the upload completes: racy, the image or the row could be missing when the worker runs
- Postgres as the queue (`SKIP LOCKED`): workable, but loses SQS's free retries, dead-letter queue and redrive
- Keeping images indefinitely or versioning the bucket: storage cost with no value for a trial

### Choice:
- The API writes the job row, then returns a presigned POST locked to `scans/{jobId}.{ext}`, the content type and 1 byte–20 MB, valid 5 minutes. The browser uploads straight to S3
- S3 sends `ObjectCreated` for `scans/` to the inference queue. The image always exists, and the row was written first, so the worker never races
- Scans bucket: public access blocked, bucket-owner object ownership, SSE-S3, non-TLS requests denied, CORS POST from the frontend origins only, objects expire after 7 days
- Inference queue: 20 s long polling, 300 s visibility timeout (TTA plus Bedrock), 4-day retention, SSE-SQS
- Dead-letter queue after 3 deliveries, kept 14 days, redrive allowed only back to the inference queue; the worker marks the job `failed` on the last delivery so the UI never spins forever
- `max_receive_count` is one Terraform variable that sets both the redrive policy and the worker's `MAX_RECEIVE_COUNT`
- Cost: ~$0 (SQS free tier covers ~130k idle polls a month; images live 7 days)

## What could change in the future:
- A longer retention or a separate archive bucket if scans need to be kept for audit
- Extending the visibility timeout from the worker (heartbeat) if very slow scans become normal
