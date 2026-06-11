import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle:
    !!process.env.S3_ENDPOINT?.includes("localhost") ||
    !!process.env.S3_ENDPOINT?.includes("minio"),
});

const bucket = process.env.S3_BUCKET || "tessera";

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

export async function deleteFromS3(key: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function downloadFromS3(key: string) {
  const result = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!result.Body) throw new Error("Object not found");
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function getStorageUsage() {
  let token: string | undefined;
  let bytes = 0;
  let objects = 0;
  do {
    const result = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: token,
      }),
    );
    for (const object of result.Contents || []) {
      bytes += object.Size || 0;
      objects += 1;
    }
    token = result.NextContinuationToken;
  } while (token);
  return { bytes, objects };
}
