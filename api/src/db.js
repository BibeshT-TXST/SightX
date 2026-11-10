/**
 * Postgres connection for the API Lambda.
 *
 * One pool of at most ONE connection per Lambda instance, created on the
 * first request and reused while the instance stays warm. With Lambda
 * concurrency capped in Terraform, total connections stay well under the
 * small RDS instance's limit without paying for RDS Proxy.
 *
 * On RDS the password is a short-lived IAM auth token, signed locally (no
 * network call, so no VPC endpoint is needed) each time a connection opens.
 *
 * Environment:
 *   DB_HOST, DB_PORT (5432), DB_NAME (sightx), DB_USER (sightx_api)
 *   DB_PASSWORD  if set, used instead of an IAM token (local dev)
 *   DB_SSL       "verify" (default) checks the RDS certificate; needs
 *                NODE_EXTRA_CA_CERTS=/var/runtime/ca-cert.pem on Lambda.
 *                "disable" for a local Postgres without TLS.
 *   AWS_REGION   set by Lambda
 */
import pg from 'pg';
import { Signer } from '@aws-sdk/rds-signer';

let pool;

export function getDb() {
  if (pool) return pool;

  const {
    DB_HOST,
    DB_PORT = '5432',
    DB_NAME = 'sightx',
    DB_USER = 'sightx_api',
    DB_PASSWORD,
    DB_SSL = 'verify',
    AWS_REGION,
  } = process.env;

  const signer = new Signer({
    hostname: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USER,
    region: AWS_REGION,
  });

  pool = new pg.Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    // pg calls this for every new connection, so tokens never expire in use
    password: DB_PASSWORD ? DB_PASSWORD : () => signer.getAuthToken(),
    ssl: DB_SSL === 'disable' ? false : { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  // A connection that drops while the Lambda is frozen emits an error on the
  // pool. Without a listener that would crash the process; with one, pg
  // discards the connection and opens a new one on the next query.
  pool.on('error', (err) => console.warn('[db] idle connection error:', err.message));

  return pool;
}
