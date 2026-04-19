import type { FastifyReply } from 'fastify';

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

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode: number = 200,
): void {
  const payload: ApiSuccessResponse<T> = { success: true, data };
  void reply.status(statusCode).send(payload);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const error: ApiErrorBody =
    details === undefined
      ? { code, message }
      : { code, message, details };

  const payload: ApiErrorResponse = { success: false, error };
  void reply.status(statusCode).send(payload);
}
