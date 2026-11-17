import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) throw new Error('Usage: npm run user:make-admin -- user@example.com');

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
    select: { email: true },
  });
  console.log(`Administrator access enabled for ${user.email}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
