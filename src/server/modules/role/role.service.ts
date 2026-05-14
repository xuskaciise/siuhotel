import { prisma } from '../../lib/prisma';



export type RoleWithPermissions = {

  id: string;

  name: string;

  description: string | null;

  permissions: { id: string; code: string; description: string | null }[];

};



export async function listRolesWithPermissions(): Promise<RoleWithPermissions[]> {

  const rows = await prisma.role.findMany({

    orderBy: { name: 'asc' },

    include: {

      permissions: {

        include: { permission: true },

      },

    },

  });

  return rows.map((r) => ({

    id: r.id,

    name: r.name,

    description: r.description,

    permissions: r.permissions.map((rp) => ({

      id: rp.permission.id,

      code: rp.permission.code,

      description: rp.permission.description,

    })),

  }));

}

