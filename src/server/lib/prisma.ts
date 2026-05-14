import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Bump tiny Prisma→Postgres pools (common on Neon URLs) so concurrent RSC + API
 * queries do not deadlock on `connection_limit=1`.
 */
function prismaDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  try {
    const u = new URL(raw);
    const lim = Number.parseInt(u.searchParams.get('connection_limit') ?? '0', 10);
    if (Number.isNaN(lim) || lim < 5) {
      u.searchParams.set('connection_limit', '10');
    }
    const pt = u.searchParams.get('pool_timeout');
    const ptNum = pt === null ? 0 : Number.parseInt(pt, 10);
    if (pt === null || Number.isNaN(ptNum) || ptNum < 20) {
      u.searchParams.set('pool_timeout', '30');
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (raw === undefined || raw.trim() === '') {
    throw new Error('DATABASE_URL is not set');
  }
  const url = prismaDatasourceUrl() ?? raw;
  const log =
    process.env.NODE_ENV === 'development'
      ? (['query', 'warn', 'error'] as const)
      : (['error'] as const);

  if (raw.includes('neon.tech')) {
    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString: url }),
      log: [...log],
    });
  }

  return new PrismaClient({
    ...(url !== raw ? { datasourceUrl: url } : {}),
    log: [...log],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
