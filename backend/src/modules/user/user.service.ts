import type { Prisma, User } from '@prisma/client';

import { prisma } from '../../lib/prisma';

import { AppError } from '../../lib/app-error';

import { hashPassword } from '../../lib/password';

import type { CreateUserInput } from './user.schema';



function isPrismaKnownError(err: unknown): err is { code: string } {

  return typeof err === 'object' && err !== null && 'code' in err;

}



const userInclude = {

  role: {

    select: {

      id: true,

      name: true,

      description: true,

      permissions: {

        select: {

          permission: {

            select: { id: true, code: true, description: true },

          },

        },

      },

    },

  },

} as const;



export type UserWithRole = Prisma.UserGetPayload<{ include: typeof userInclude }>;



export type PublicUser = Omit<User, 'passwordHash'> & {

  role: {

    id: string;

    name: string;

    description: string | null;

    permissions: { id: string; code: string; description: string | null }[];

  };

};



function mapToPublicUser(row: UserWithRole): PublicUser {

  const { passwordHash: _p, role, ...rest } = row;

  return {

    ...rest,

    role: {

      id: role.id,

      name: role.name,

      description: role.description,

      permissions: role.permissions.map((rp) => ({

        id: rp.permission.id,

        code: rp.permission.code,

        description: rp.permission.description,

      })),

    },

  };

}



export async function createUser(input: CreateUserInput): Promise<PublicUser> {

  const passwordHash = await hashPassword(input.password);

  let roleId = input.roleId;

  if (roleId === undefined) {

    const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });

    if (staffRole === null) {

      throw new AppError(500, 'ROLES_NOT_SEEDED', 'Default STAFF role is missing; run migrations');

    }

    roleId = staffRole.id;

  } else {

    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (role === null) {

      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');

    }

  }



  try {

    const row = await prisma.user.create({

      data: {

        email: input.email.toLowerCase().trim(),

        passwordHash,

        fullName: input.fullName,

        roleId,

      },

      include: userInclude,

    });

    return mapToPublicUser(row);

  } catch (err) {

    if (isPrismaKnownError(err) && err.code === 'P2002') {

      throw new AppError(409, 'EMAIL_TAKEN', 'A user with this email already exists');

    }

    throw err;

  }

}



export async function getUserById(id: string): Promise<User | null> {

  return prisma.user.findUnique({ where: { id } });

}



export async function listUsers(): Promise<PublicUser[]> {

  const rows = await prisma.user.findMany({

    orderBy: { createdAt: 'desc' },

    include: userInclude,

  });

  return rows.map(mapToPublicUser);

}

