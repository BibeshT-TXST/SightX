### Problem:
The React app is static files. It needs HTTPS, client-side routes (`/dashboard`) that survive a refresh, and hosting that costs nothing while idle

### Options Rejected:
- Nginx container (V1): an always-on host for static files
- S3 static website hosting: HTTP only, and the bucket must be public
- CloudFront with the legacy Origin Access Identity: superseded by Origin Access Control
- A custom domain: a yearly domain fee and certificate setup the trial does not need
- All CloudFront edge locations: higher price class with no benefit for the expected audience

### Choice:
- Private S3 bucket (public access blocked, SSE-S3, non-TLS denied) readable only by one CloudFront distribution through Origin Access Control
- CloudFront redirects HTTP to HTTPS, serves HTTP/2 and HTTP/3 with compression, and uses AWS's managed CachingOptimized and SecurityHeaders policies
- 403 and 404 return `/index.html` with 200, so React Router handles every path
- `PriceClass_100` (North America and Europe) and the default `*.cloudfront.net` certificate
- The CloudFront origin is added to the scans bucket's and the HTTP API's CORS automatically
- Deploys: `npm run build`, `aws s3 sync dist`, invalidate `/index.html` only (Vite hashes every other file name)
- Cost: $0 (CloudFront's always-free tier covers 1 TB and 10M requests a month)

## What could change in the future:
- A custom domain with an ACM certificate
- A CI job that builds and syncs the frontend on merge to main
