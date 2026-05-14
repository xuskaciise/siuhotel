import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { AppError, isAppError } from '../lib/app-error';

import { jsonError } from './json-envelope';

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

/** Map thrown errors to the same JSON envelopes as the former Fastify global error handler. */
export function apiErrorToResponse(error: unknown, logError?: (e: unknown) => void): Response {
  if (error instanceof ZodError) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request', error.flatten());
  }

  if (isAppError(error)) {
    return jsonError(error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logError?.(error);
    const missingUrl = error.message.includes('DATABASE_URL');
    const message = missingUrl
      ? 'DATABASE_URL is not set. Add it to environment variables and restart.'
      : 'The database client could not start. Check DATABASE_URL, that PostgreSQL is running, and that migrations have been applied.';
    const initDetails =
      process.env.NODE_ENV === 'development' ? { prismaMessage: error.message } : undefined;
    return jsonError(503, 'DATABASE_CONFIGURATION_ERROR', message, initDetails);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return jsonError(
      400,
      'PRISMA_VALIDATION_ERROR',
      'Invalid data supplied for a database operation.',
      process.env.NODE_ENV === 'development' ? { message: error.message } : undefined,
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logError?.(error);
    const details = prismaKnownRequestDetails(error);

    switch (error.code) {
      case 'P2021':
        return jsonError(
          503,
          'DATABASE_SCHEMA_MISSING',
          'A required table is missing. Run: npx prisma migrate deploy',
          details,
        );
      case 'P1001':
      case 'P1002':
        return jsonError(
          503,
          'DATABASE_UNAVAILABLE',
          'Cannot reach the database server. Check DATABASE_URL, network, VPN, and that the host allows your IP (Neon: trusted IPs / pooler).',
          details,
        );
      case 'P1000':
        return jsonError(
          503,
          'DATABASE_AUTH_FAILED',
          'Database credentials in DATABASE_URL were rejected.',
          details,
        );
      case 'P1003':
        return jsonError(
          503,
          'DATABASE_NOT_FOUND',
          'The database name in DATABASE_URL does not exist on the server.',
          details,
        );
      case 'P2002':
        return jsonError(
          409,
          'UNIQUE_CONSTRAINT_VIOLATION',
          'This value already exists in the database (for example a duplicate email or phone).',
          details,
        );
      case 'P2003':
        return jsonError(
          400,
          'FOREIGN_KEY_VIOLATION',
          'A related record is missing or could not be linked (for example an invalid room or customer id).',
          details,
        );
      case 'P2034':
        return jsonError(
          409,
          'TRANSACTION_CONFLICT',
          'This change conflicted with another update. Please try again.',
          details,
        );
      case 'P2025':
        return jsonError(
          404,
          'RECORD_NOT_FOUND',
          'The requested record was not found in the database.',
          details,
        );
      case 'P2011':
        return jsonError(
          400,
          'NULL_CONSTRAINT_VIOLATION',
          'A required value was missing for this operation.',
          details,
        );
      default:
        return jsonError(
          500,
          'DATABASE_REQUEST_ERROR',
          `A database error occurred (${error.code}). Please try again; if it keeps happening, contact support.`,
          details,
        );
    }
  }

  if (isNetworkConnectionFailure(error)) {
    logError?.(error);
    return jsonError(
      503,
      'STORAGE_UNAVAILABLE',
      'Cannot connect to MinIO (file storage). Start MinIO on the host/port in .env (default localhost:9000), or set MINIO_ENDPOINT / MINIO_PORT to your reachable server.',
      connectionFailureDevDetails(error),
    );
  }

  logError?.(error);
  return jsonError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
