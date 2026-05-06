import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';

import Fastify, { type FastifyInstance } from 'fastify';

import { registerAuthRoutes } from './modules/auth/auth.controller';
import { registerBookingRoutes } from './modules/booking/booking.controller';

import { registerCmsRoutes } from './modules/cms/cms.controller';

import { registerCustomerRoutes } from './modules/customer/customer.controller';

import { registerDashboardRoutes } from './modules/dashboard/dashboard.controller';

import { registerPublicRoutes } from './modules/public/public.controller';

import { registerRoleRoutes } from './modules/role/role.controller';

import { registerRoomRoutes } from './modules/room/room.controller';

import { registerSetupRoutes } from './modules/setup/setup.controller';
import { registerStorageRoutes } from './modules/storage/storage.controller';

import { registerTransactionRoutes } from './modules/transaction/transaction.controller';

import { registerUserRoutes } from './modules/user/user.controller';

import { registerGlobalErrorHandler } from './plugins/error-handler';

function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s !== undefined && s.length >= 16) {
    return s;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (minimum 16 characters) in production.');
  }
  return 'dev-siu-hotel-jwt-secret-min-32chars';
}

export async function buildApp(): Promise<FastifyInstance> {

  const app = Fastify({

    logger: true,

  });



  registerGlobalErrorHandler(app);



  await app.register(multipart, {

    limits: {

      fileSize: 10 * 1024 * 1024,

      files: 30,

      fields: 30,

      parts: 100,

    },

    isPartAFile: (fieldName, contentType, fileName) => {

      if (fileName !== undefined && fileName !== '') {

        return true;

      }

      if (contentType !== undefined && contentType.startsWith('image/')) {

        return true;

      }

      return contentType === 'application/octet-stream';

    },

  });

  await app.register(jwt, {
    secret: resolveJwtSecret(),
    sign: { expiresIn: '7d' },
  });

  registerAuthRoutes(app);

  registerSetupRoutes(app);

  registerPublicRoutes(app);

  registerStorageRoutes(app);

  registerRoomRoutes(app);

  registerRoleRoutes(app);

  registerUserRoutes(app);

  registerCustomerRoutes(app);

  registerBookingRoutes(app);

  registerTransactionRoutes(app);

  registerDashboardRoutes(app);

  registerCmsRoutes(app);



  app.get('/health', async () => ({ status: 'ok' as const }));



  return app;

}

