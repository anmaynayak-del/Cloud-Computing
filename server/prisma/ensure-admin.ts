import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { name: 'name' },
        { email: 'name' },
        { email: 'name@example.com' },
        { email: 'demo@example.com' },
      ],
    },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN' },
    });
    console.log(`Updated user ${updated.email} (${updated.name}) to role: ${updated.role}`);
  } else {
    const passwordHash = await bcrypt.hash('demo123', 10);
    const created = await prisma.user.create({
      data: {
        name: 'name',
        email: 'name@example.com',
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`Created new admin user ${created.email} (${created.name}) with role: ${created.role}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
