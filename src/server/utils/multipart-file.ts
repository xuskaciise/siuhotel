import { AppError } from '../lib/app-error';

export type MultipartFilePart = {
  buffer: Buffer;
  mimetype: string;
  filename: string;
};

export async function consumeAllMultipartFiles(request: Request): Promise<MultipartFilePart[]> {
  const ct = request.headers.get('content-type');
  if (ct === null || !ct.toLowerCase().includes('multipart/form-data')) {
    throw new AppError(
      400,
      'NOT_MULTIPART',
      'Use Body → form-data in Postman (not raw JSON). Do not set Content-Type manually.',
    );
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError(400, 'NOT_MULTIPART', 'Invalid multipart body');
  }
  const files: MultipartFilePart[] = [];
  for (const [, value] of form.entries()) {
    if (value instanceof File && value.size > 0) {
      const buffer = Buffer.from(await value.arrayBuffer());
      const filename = value.name !== undefined && value.name !== '' ? value.name : 'upload';
      files.push({
        buffer,
        mimetype: value.type !== undefined && value.type !== '' ? value.type : 'application/octet-stream',
        filename,
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

export async function consumeFirstMultipartFile(request: Request): Promise<MultipartFilePart> {
  const files = await consumeAllMultipartFiles(request);
  return files[0]!;
}
