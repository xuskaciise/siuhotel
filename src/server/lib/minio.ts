import dotenv from 'dotenv';
import * as Minio from 'minio';
import { existsSync } from 'node:fs';
import path from 'node:path';

let minioClient: Minio.Client | null = null;
let minioClientFingerprint: string | null = null;

/** Dev: re-read `.env` so MINIO_* changes apply without editing code (tsx does not watch `.env`). */
function reloadDotenvInDevelopment(): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  const envPath = path.resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

function minioSettingsFingerprint(): string {
  return [
    process.env.MINIO_ENDPOINT ?? '',
    process.env.MINIO_PORT ?? '',
    process.env.MINIO_USE_SSL ?? '',
    process.env.MINIO_ACCESS_KEY ?? '',
    process.env.MINIO_SECRET_KEY ?? '',
  ].join('\u0000');
}

/** Host only — strips `http(s)://` if pasted from a browser URL. */
function normalizeMinioEndpoint(raw: string): string {
  let s = raw.trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('https://')) {
    s = s.slice(8);
  } else if (lower.startsWith('http://')) {
    s = s.slice(7);
  }
  const slash = s.search(/[/\\]/);
  if (slash !== -1) {
    s = s.slice(0, slash);
  }
  return s.trim();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getDefaultBucketName(): string {
  return requireEnv('MINIO_BUCKET');
}

function resolveBucket(bucket?: string): string {
  return bucket ?? getDefaultBucketName();
}

const DEFAULT_MINIO_REGION = process.env.MINIO_REGION ?? 'us-east-1';

/**
 * Ensures the bucket exists (MinIO / S3). Safe to call before every upload.
 */
export async function ensureBucketExists(bucket: string): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, DEFAULT_MINIO_REGION);
  }
}

export function getMinioClient(): Minio.Client {
  reloadDotenvInDevelopment();
  const fp = minioSettingsFingerprint();
  if (minioClient !== null && minioClientFingerprint === fp) {
    return minioClient;
  }

  const portRaw = process.env.MINIO_PORT ?? '9000';
  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid MINIO_PORT: ${portRaw}`);
  }

  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const endPoint = normalizeMinioEndpoint(requireEnv('MINIO_ENDPOINT'));

  minioClient = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey: requireEnv('MINIO_ACCESS_KEY'),
    secretKey: requireEnv('MINIO_SECRET_KEY'),
  });
  minioClientFingerprint = fp;

  return minioClient;
}

export interface UploadFileParams {
  /** When set, uploads to this bucket instead of `MINIO_BUCKET`. */
  bucket?: string;
  objectName: string;
  body: Buffer;
  contentType?: string;
  /** Byte length; defaults to `body.length` when omitted */
  size?: number;
}

/**
 * Uploads a buffer to MinIO. All file storage must go through this layer (see AI_RULES).
 */
export async function uploadFile(params: UploadFileParams): Promise<void> {
  const client = getMinioClient();
  const bucket = resolveBucket(params.bucket);
  await ensureBucketExists(bucket);
  const size = params.size ?? params.body.length;

  const metaData: Record<string, string> = {};
  if (params.contentType !== undefined && params.contentType !== '') {
    metaData['Content-Type'] = params.contentType;
  }

  await client.putObject(
    bucket,
    params.objectName,
    params.body,
    size,
    Object.keys(metaData).length > 0 ? metaData : undefined,
  );
}

export interface DeleteFileParams {
  bucket?: string;
  objectPath: string;
}

export async function deleteFile(params: DeleteFileParams): Promise<void> {
  const client = getMinioClient();
  const bucket = resolveBucket(params.bucket);
  await client.removeObject(bucket, params.objectPath);
}

export interface GetFileUrlParams {
  bucket?: string;
  objectPath: string;
}

export async function getFileUrl(params: GetFileUrlParams): Promise<string> {
  const client = getMinioClient();
  const bucket = resolveBucket(params.bucket);
  const expiryRaw = process.env.MINIO_PRESIGNED_EXPIRY_SECONDS ?? '3600';
  const expirySeconds = Number.parseInt(expiryRaw, 10);
  if (Number.isNaN(expirySeconds) || expirySeconds < 1) {
    throw new Error(`Invalid MINIO_PRESIGNED_EXPIRY_SECONDS: ${expiryRaw}`);
  }
  return client.presignedGetObject(bucket, params.objectPath, expirySeconds);
}

export interface ListObjectKeysParams {
  bucket?: string;
  /** Prefix such as `room-types/{id}/` (no leading slash). */
  prefix: string;
  /** When true, include objects under subfolders (default true). */
  recursive?: boolean;
}

/**
 * Lists object keys under a prefix (for admin UI: show files already in MinIO).
 */
export async function listObjectKeys(params: ListObjectKeysParams): Promise<string[]> {
  const client = getMinioClient();
  const bucket = resolveBucket(params.bucket);
  const prefix = params.prefix.replace(/^\//, '');
  const recursive = params.recursive ?? true;
  const stream = client.listObjectsV2(bucket, prefix, recursive);
  const keys: string[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (obj: { name?: string; prefix?: string }) => {
      const name = obj.name;
      if (name !== undefined && name !== '' && !name.endsWith('/')) {
        keys.push(name);
      }
    });
    stream.on('error', reject);
    stream.on('end', () => resolve());
  });
  keys.sort();
  return keys;
}
