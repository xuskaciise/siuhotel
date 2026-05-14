import { getFileUrl } from '../../lib/minio';
import { AppError } from '../../lib/app-error';
import { HOTEL_POS_ASSETS_BUCKET } from '../room/room.service';

/**
 * Only hotel asset prefixes may be presigned (MinIO keys stored on Room / RoomType).
 * Blocks traversal and arbitrary bucket reads.
 */
export function assertAllowedAssetObjectPath(objectPath: string): void {
  if (objectPath.includes('..') || objectPath.includes('//') || objectPath.startsWith('/')) {
    throw new AppError(400, 'INVALID_OBJECT_PATH', 'Invalid object path');
  }
  if (!/^(rooms|room-types|customers|users)\/[^/]+\/.+$/i.test(objectPath)) {
    throw new AppError(
      400,
      'INVALID_OBJECT_PATH',
      'Path must look like rooms/{id}/..., room-types/{id}/..., or customers/{id}/...',
    );
  }
}

export async function presignGetUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)];
  const out: Record<string, string> = {};
  for (const p of unique) {
    assertAllowedAssetObjectPath(p);
    out[p] = await getFileUrl({ objectPath: p, bucket: HOTEL_POS_ASSETS_BUCKET });
  }
  return out;
}
