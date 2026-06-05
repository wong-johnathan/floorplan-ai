import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    console.warn('S3 storage not configured (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY). Using local filesystem fallback.');
    return null;
  }

  s3Client = new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true, // Required for MinIO
  });

  return s3Client;
}

export function isR2Configured(): boolean {
  return getS3Client() !== null;
}

/**
 * Store a file. Uses S3 (MinIO/R2) if configured, otherwise falls back to local filesystem.
 */
export async function storeFile(key: string, body: Buffer, contentType: string): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET_NAME ?? 'floorplan-ai';
  const publicUrl = process.env.S3_PUBLIC_URL ?? 'http://localhost:9000';

  if (client) {
    // Ensure bucket exists (MinIO auto-creates, but we do a head check)
    const { HeadBucketCommand, CreateBucketCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return `${publicUrl}/${bucket}/${key}`;
  }

  // Local filesystem fallback
  const fs = await import('fs');
  const path = await import('path');
  const localDir = path.resolve(process.cwd(), 'uploads');
  const filePath = path.join(localDir, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, body);
  return `/uploads/${key}`;
}
