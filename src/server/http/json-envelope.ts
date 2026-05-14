import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export function jsonSuccess<T>(data: T, statusCode: number = 200): NextResponse {
  const payload: ApiSuccessResponse<T> = { success: true, data };
  return NextResponse.json(payload, { status: statusCode });
}

export function jsonError(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse {
  const error: ApiErrorBody =
    details === undefined ? { code, message } : { code, message, details };
  const payload: ApiErrorResponse = { success: false, error };
  return NextResponse.json(payload, { status: statusCode });
}
