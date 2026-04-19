import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../lib/app-error';

export type MultipartFilePart = {
  buffer: Buffer;
  mimetype: string;
  filename: string;
};

function assertMultipart(request: FastifyRequest): void {
  if (!request.isMultipart()) {
    throw new AppError(
      400,
      'NOT_MULTIPART',
      'Use Body → form-data in Postman (not raw JSON). Do not set Content-Type manually.',
    );
  }
}

/**
 * Reads every file part in the multipart body (same `file` key repeated in Postman, or multiple keys).
 * All streams are consumed so @fastify/multipart completes.
 */
export async function consumeAllMultipartFiles(request: FastifyRequest): Promise<MultipartFilePart[]> {
  assertMultipart(request);

  const files: MultipartFilePart[] = [];

  for await (const part of request.parts()) {
    if (part.type === 'field') {
      continue;
    }
    if (part.type === 'file') {
      const f = part as MultipartFile;
      const buffer = await f.toBuffer();
      const name = f.filename !== undefined && f.filename !== '' ? f.filename : 'upload';
      files.push({
        buffer,
        mimetype: f.mimetype,
        filename: name,
      });
    }
  }

  if (files.length === 0) {
    throw new AppError(
      400,
      'NO_FILE',
      'No file part found. Add one or more rows with type "File" (e.g. key "file") and choose images.',
    );
  }

  return files;
}

/**
 * Same as {@link consumeAllMultipartFiles} but returns only the first file (backwards-compatible).
 */
export async function consumeFirstMultipartFile(request: FastifyRequest): Promise<MultipartFilePart> {
  const files = await consumeAllMultipartFiles(request);
  return files[0]!;
}
