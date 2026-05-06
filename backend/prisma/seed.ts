import { PrismaClient } from '@prisma/client';

import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = 'reception';

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing === null) {
    const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });

    if (staffRole === null) {
      console.error('STAFF role missing — run migrations before seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('StaffDemo123!', 10);

    await prisma.user.create({
      data: {
        username,
        email: 'reception@siu-hotel.local',
        fullName: 'Demo Reception',
        passwordHash,
        roleId: staffRole.id,
      },
    });

    console.log(`Created seed staff user "${username}" (password: StaffDemo123!)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
