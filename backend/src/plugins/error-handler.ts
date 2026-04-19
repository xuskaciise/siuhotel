import type { FastifyError, FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, isAppError } from '../lib/app-error';
import { sendError } from '../utils/api-response';

function isFastifyError(error: unknown): error is FastifyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as FastifyError).statusCode === 'number'
  );
}

/** MinIO / TCP failures often surface as ECONNREFUSED (sometimes wrapped in AggregateError). */
function isNetworkConnectionFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const e = error as NodeJS.ErrnoException;
  if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.code === 'ENOTFOUND') {
    return true;
  }
  if (error instanceof AggregateError && Array.isArray(error.errors)) {
    return error.errors.some((sub) => isNetworkConnectionFailure(sub));
  }
  return false;
}

function connectionFailureDevDetails(error: unknown): Record<string, unknown> | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }
  if (error instanceof AggregateError && Array.isArray(error.errors)) {
    return {
      errors: error.errors.map((sub) =>
        sub instanceof Error
          ? { message: sub.message, code: (sub as NodeJS.ErrnoException).code }
          : String(sub),
      ),
    };
  }
  if (error instanceof Error) {
    return { message: error.message, code: (error as NodeJS.ErrnoException).code };
  }
  return undefined;
}

function prismaKnownRequestDetails(error: Prisma.PrismaClientKnownRequestError) {
  if (process.env.NODE_ENV === 'development') {
    return { prismaCode: error.code, meta: error.meta, message: error.message };
  }
  return { prismaCode: error.code };
}

export function registerGlobalErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (reply.sent) {
      return;
    }

    if (error instanceof ZodError) {
      sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request', error.flatten());
      return;
    }

    if (isAppError(error)) {
      sendError(reply, error.statusCode, error.code, error.message, error.details);
      return;
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      const missingUrl = error.message.includes('DATABASE_URL');
      const message = missingUrl
        ? 'DATABASE_URL is not set. Add it to backend/.env (see .env.example) and restart the server.'
        : 'The database client could not start. Check DATABASE_URL, that PostgreSQL is running, and that migrations have been applied.';
      request.log.error(error);
      const initDetails =
        process.env.NODE_ENV === 'development' ? { prismaMessage: error.message } : undefined;
      sendError(reply, 503, 'DATABASE_CONFIGURATION_ERROR', message, initDetails);
      return;
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      sendError(
        reply,
        400,
        'PRISMA_VALIDATION_ERROR',
        'Invalid data supplied for a database operation.',
        process.env.NODE_ENV === 'development' ? { message: error.message } : undefined,
      );
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      request.log.error(error);
      const details = prismaKnownRequestDetails(error);

      switch (error.code) {
        case 'P2021':
          sendError(
            reply,
            503,
            'DATABASE_SCHEMA_MISSING',
            'A required table is missing. From the backend folder run: npx prisma migrate deploy',
            details,
          );
          return;
        case 'P1001':
        case 'P1002':
          sendError(
            reply,
            503,
            'DATABASE_UNAVAILABLE',
            'Cannot reach the database server. Check DATABASE_URL, network, VPN, and that the host allows your IP (Neon: trusted IPs / pooler).',
            details,
          );
          return;
        case 'P1000':
          sendError(
            reply,
            503,
            'DATABASE_AUTH_FAILED',
            'Database credentials in DATABASE_URL were rejected.',
            details,
          );
          return;
        case 'P1003':
          sendError(
            reply,
            503,
            'DATABASE_NOT_FOUND',
            'The database name in DATABASE_URL does not exist on the server.',
            details,
          );
          return;
        default:
          sendError(
            reply,
            500,
            'DATABASE_REQUEST_ERROR',
            'A database error occurred while processing this request.',
            details,
          );
          return;
      }
    }

    if (isNetworkConnectionFailure(error)) {
      request.log.error(error);
      sendError(
        reply,
        503,
        'STORAGE_UNAVAILABLE',
        'Cannot connect to MinIO (file storage). Start MinIO on the host/port in .env (default localhost:9000), or set MINIO_ENDPOINT / MINIO_PORT to your reachable server.',
        connectionFailureDevDetails(error),
      );
      return;
    }

    if (isFastifyError(error)) {
      const statusCode =
        error.statusCode !== undefined &&
        error.statusCode >= 400 &&
        error.statusCode < 600
          ? error.statusCode
          : 500;

      if (statusCode === 400 && error.validation !== undefined) {
        sendError(reply, 400, 'VALIDATION_ERROR', error.message, error.validation);
        return;
      }

      if (statusCode >= 500) {
        request.log.error(error);
        sendError(reply, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
        return;
      }

      sendError(
        reply,
        statusCode,
        'REQUEST_ERROR',
        error.message !== '' ? error.message : 'Request failed',
      );
      return;
    }

    request.log.error(error);
    sendError(reply, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  });
}
