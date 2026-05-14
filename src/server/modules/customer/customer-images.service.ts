import { randomUUID } from 'node:crypto';

import { deleteFile, listObjectKeys, uploadFile } from '../../lib/minio';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import type { MultipartFilePart } from '../../utils/multipart-file';

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

function validateImageMime(mime: string): (typeof allowedMimes)[number] {
  const m = mime.toLowerCase().trim();
  if ((allowedMimes as readonly string[]).includes(m)) return m as (typeof allowedMimes)[number];
  throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, or GIF images are allowed');
}

function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 90) || 'image';
}

async function assertCustomerExists(customerId: string): Promise<void> {
  const row = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (row === null) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
}

export async function uploadCustomerImages(customerId: string, files: MultipartFilePart[]): Promise<string[]> {
  await assertCustomerExists(customerId);
  const paths: string[] = [];
  for (const file of files) {
    const mime = validateImageMime(file.mimetype);
    const objectName = `customers/${customerId}/${randomUUID()}-${sanitizeFilename(file.filename ?? 'image')}`;
    await uploadFile({ objectName, body: file.buffer, contentType: mime });
    paths.push(objectName);
  }
  return paths;
}

export async function removeCustomerImage(customerId: string, objectPath: string): Promise<{ deleted: boolean }> {
  await assertCustomerExists(customerId);
  const prefix = `customers/${customerId}/`;
  if (!objectPath.startsWith(prefix)) {
    throw new AppError(400, 'INVALID_IMAGE_PATH', 'Image path must be under this customer folder');
  }
  await deleteFile({ objectPath });
  return { deleted: true };
}

export async function listCustomerStorageKeys(customerId: string): Promise<{ keys: string[] }> {
  await assertCustomerExists(customerId);
  const keys = await listObjectKeys({ prefix: `customers/${customerId}/` });
  return { keys };
}

