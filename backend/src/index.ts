import 'dotenv/config';
import { buildApp } from './app';

if (process.env.DATABASE_URL === undefined || String(process.env.DATABASE_URL).trim() === '') {
  // eslint-disable-next-line no-console -- bootstrap message before logger exists
  console.error(
    '[siu-hotel-backend] FATAL: DATABASE_URL is not set.\n' +
      '  Copy backend/.env.example to backend/.env, set DATABASE_URL to your PostgreSQL URL, run migrations, then start again.',
  );
  process.exit(1);
}

const portRaw = process.env.PORT ?? '3000';
const port = Number.parseInt(portRaw, 10);
if (Number.isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${portRaw}`);
}

const host = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exitCode = 1;
  }
}

void main();
