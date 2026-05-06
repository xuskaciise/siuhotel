import type { Prisma, User } from '@prisma/client';

import { prisma } from '../../lib/prisma';

import { AppError } from '../../lib/app-error';

import { hashPassword, verifyPassword } from '../../lib/password';

import type { CreateUserInput, UpdateUserInput } from './user.schema';



function isPrismaKnownError(err: unknown): err is { code: string } {

  return typeof err === 'object' && err !== null && 'code' in err;

}



const userIncludeFull = {

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

const userIncludeLite = {
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
} as const;



export type UserWithRole = Prisma.UserGetPayload<{ include: typeof userIncludeFull }>;
type UserWithRoleLite = Prisma.UserGetPayload<{ include: typeof userIncludeLite }>;



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

function mapToPublicUserLite(row: UserWithRoleLite): PublicUser {
  const { passwordHash: _p, role, ...rest } = row as unknown as UserWithRole;
  return {
    ...(rest as Omit<User, 'passwordHash'>),
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: [],
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

        username: input.username.toLowerCase().trim(),

        email:
          input.email !== undefined && input.email.trim() !== ''
            ? input.email.toLowerCase().trim()
            : null,

        passwordHash,

        fullName: input.fullName,

        roleId,

      },

      include: userIncludeFull,

    });

    return mapToPublicUser(row);

  } catch (err) {

    if (isPrismaKnownError(err) && err.code === 'P2002') {

      throw new AppError(409, 'USER_IDENTIFIER_TAKEN', 'That username or email is already in use');

    }

    throw err;

  }

}



export async function getUserById(id: string): Promise<User | null> {

  return prisma.user.findUnique({ where: { id } });

}



export async function verifyStaffLogin(username: string, password: string): Promise<PublicUser | null> {

  const row = await prisma.user.findUnique({

    where: { username: username.toLowerCase().trim() },

    include: userIncludeFull,

  });

  if (row === null) {

    return null;

  }

  if (row.isActive === false) {
    return null;
  }

  const ok = await verifyPassword(password, row.passwordHash);

  if (!ok) {

    return null;

  }

  return mapToPublicUser(row);

}



export async function getPublicUserById(id: string): Promise<PublicUser | null> {

  const row = await prisma.user.findUnique({

    where: { id },

    include: userIncludeFull,

  });

  return row === null ? null : mapToPublicUser(row);

}



export async function listUsers(): Promise<PublicUser[]> {

  const rows = await prisma.user.findMany({

    orderBy: { createdAt: 'desc' },

    include: userIncludeLite,

  });

  return rows.map(mapToPublicUserLite);

}

export async function updateUser(id: string, input: UpdateUserInput): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (existing === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (input.roleId !== undefined) {
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (role === null) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.username !== undefined) data.username = input.username.toLowerCase().trim();
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.email !== undefined) {
    data.email = input.email === null ? null : input.email.toLowerCase().trim();
  }
  if (input.roleId !== undefined) data.role = { connect: { id: input.roleId } };
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);

  try {
    const row = await prisma.user.update({
      where: { id },
      data,
      include: userIncludeFull,
    });
    return mapToPublicUser(row);
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === 'P2002') {
      throw new AppError(409, 'USER_IDENTIFIER_TAKEN', 'That username or email is already in use');
    }
    throw err;
  }
}

export async function deleteUser(id: string): Promise<{ deleted: boolean }> {
  try {
    await prisma.user.delete({ where: { id } });
    return { deleted: true };
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === 'P2025') {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    if (isPrismaKnownError(err) && err.code === 'P2003') {
      throw new AppError(409, 'USER_IN_USE', 'Cannot delete this user because related records exist.');
    }
    throw err;
  }
}



export async function countUsers(): Promise<number> {

  return prisma.user.count();

}

