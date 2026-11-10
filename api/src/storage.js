/**
 * Presigned S3 uploads.
 *
 * The browser uploads scans straight to S3 with a presigned POST, so images
 * never pass through Lambda (no 6 MB payload limit) and the API Lambda needs
 * no route to SQS: S3 itself sends the ObjectCreated event to the queue.
 * Signing happens locally with the Lambda's credentials; no network call.
 *
 * Environment:
 *   SCANS_BUCKET  bucket that receives uploads
 *   AWS_REGION    set by Lambda
 */
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

// Must stay at or below the worker's MAX_IMAGE_BYTES
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UPLOAD_EXPIRES_SECONDS = 300;

let s3;

/**
 * Create a presigned POST for one object. S3 rejects the upload unless the
 * key, content type and size match what was signed here.
 *
 * @returns {Promise<{url: string, fields: Record<string, string>}>}
 */
export function presignUpload(key, contentType) {
  s3 ??= new S3Client({});
  return createPresignedPost(s3, {
    Bucket: process.env.SCANS_BUCKET,
    Key: key,
    Fields: { 'Content-Type': contentType },
    Conditions: [
      ['content-length-range', 1, MAX_UPLOAD_BYTES],
      ['eq', '$Content-Type', contentType],
    ],
    Expires: UPLOAD_EXPIRES_SECONDS,
  });
}
