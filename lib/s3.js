/**
 * lib/s3.js — port of includes/s3_uploader.php using @aws-sdk/client-s3.
 *
 * ENV VARS (defaults = current PHP values — the PHP shipped with
 * placeholder credentials, so fill these in for real use):
 *   S3_BUCKET     (PHP default: "REPLACE_WITH_YOUR_BUCKET_NAME")
 *   S3_REGION     (PHP default: "ap-south-1" — Mumbai)
 *   S3_ACCESS_KEY (PHP default: "REPLACE_WITH_ACCESS_KEY")
 *   S3_SECRET_KEY (PHP default: "REPLACE_WITH_SECRET_KEY")
 *   S3_FOLDER     (PHP default: "noc-documents" — prefix inside the bucket)
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.S3_BUCKET || "REPLACE_WITH_YOUR_BUCKET_NAME";
const S3_REGION = process.env.S3_REGION || "ap-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "REPLACE_WITH_ACCESS_KEY";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "REPLACE_WITH_SECRET_KEY";
const S3_FOLDER = process.env.S3_FOLDER || "noc-documents";

let clientInstance = null;

function getClient() {
  if (!clientInstance) {
    clientInstance = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
    });
  }
  return clientInstance;
}

function objectUrl(key) {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeURI(key)}`;
}

/**
 * Generic upload — puts a buffer to S3 under the given key.
 * @param {Buffer|Uint8Array|string} buffer  File contents
 * @param {string} key                       Full object key (e.g. "noc-documents/file.pdf")
 * @param {string} contentType               MIME type
 * @returns {Promise<{success:boolean, url:?string, message:string}>}
 */
export async function uploadToS3(buffer, key, contentType) {
  try {
    const s3 = getClient();
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read", // ⚠️ change to private + presigned URLs if the bucket must stay private
      })
    );
    return { success: true, url: objectUrl(key), message: "Uploaded successfully." };
  } catch (err) {
    console.error("[S3-UPLOAD] " + (err?.message || err));
    return { success: false, url: null, message: "S3 upload failed: " + (err?.message || "unknown error") };
  }
}

/**
 * Uploads NOC PDF content to S3 — same contract as PHP noc_upload_to_s3().
 * @param {Buffer|Uint8Array|string} pdfBinary Raw PDF bytes
 * @param {string} filename e.g. NOC_BLKR00021946_20260723.pdf
 * @returns {Promise<{success:boolean, url:?string, message:string}>}
 */
export async function nocUploadToS3(pdfBinary, filename) {
  const key = S3_FOLDER.replace(/^\/+|\/+$/g, "") + "/" + filename;
  return uploadToS3(pdfBinary, key, "application/pdf");
}
