import { randomUUID } from 'node:crypto';

import { deleteFile, uploadFile } from '../../lib/minio';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import { HOTEL_POS_ASSETS_BUCKET } from '../room/room.service';
import type { MultipartFilePart } from '../../utils/multipart-file';

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

function validateImageMime(mime: string): (typeof allowedMimes)[number] {
  const m = mime.toLowerCase().trim();
  if ((allowedMimes as readonly string[]).includes(m)) return m as (typeof allowedMimes)[number];
  throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, or GIF images are allowed');
}

function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 90) || 'image'
  );
}

async function assertUserExists(userId: string): Promise<{ id: string; profileImage: string | null }> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileImage: true },
  });
  if (row === null) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return row;
}

/**
 * Uploads a single profile image for a staff user.
 * - Stored in MinIO under `users/{id}/...`
 * - DB stores the object key in `User.profileImage`
 * - Previous image (if any) is deleted (best-effort).
 */
export async function uploadUserProfileImage(
  userId: string,
  file: MultipartFilePart,
): Promise<{ objectPath: string }> {
  const row = await assertUserExists(userId);

  const mime = validateImageMime(file.mimetype);
  const objectName = `users/${userId}/${randomUUID()}-${sanitizeFilename(file.filename ?? 'profile')}`;

  await uploadFile({
    bucket: HOTEL_POS_ASSETS_BUCKET,
    objectName,
    body: file.buffer,
    contentType: mime,
  });

  await prisma.user.update({ where: { id: userId }, data: { profileImage: objectName } });

  // Best-effort cleanup to avoid orphan objects.
  if (row.profileImage && row.profileImage !== objectName) {
    try {
      await deleteFile({ bucket: HOTEL_POS_ASSETS_BUCKET, objectPath: row.profileImage });
    } catch {
      // ignore
    }
  }

  return { objectPath: objectName };
}

