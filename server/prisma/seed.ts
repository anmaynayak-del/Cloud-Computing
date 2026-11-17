import { PrismaClient } from '@prisma/client';

const TransactionType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
} as const;

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Food', type: TransactionType.EXPENSE },
  { name: 'Transport', type: TransactionType.EXPENSE },
  { name: 'Rent', type: TransactionType.EXPENSE },
  { name: 'Utilities', type: TransactionType.EXPENSE },
  { name: 'Entertainment', type: TransactionType.EXPENSE },
  { name: 'Shopping', type: TransactionType.EXPENSE },
  { name: 'Healthcare', type: TransactionType.EXPENSE },
  { name: 'Salary', type: TransactionType.INCOME },
  { name: 'Freelance', type: TransactionType.INCOME },
  { name: 'Investments', type: TransactionType.INCOME },
  { name: 'Other Income', type: TransactionType.INCOME },
];

async function main() {
  await prisma.$transaction(async tx => {
    // Serialize seeds, since PostgreSQL allows duplicate nulls in the category unique key.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(630917)`;
    const existing = await tx.category.findMany({
      where: { userId: null },
      select: { name: true, type: true },
    });
    const missing = defaultCategories.filter(category =>
      !existing.some(row => row.name === category.name && row.type === category.type)
    );
    if (missing.length > 0) await tx.category.createMany({ data: missing });
  });
  console.log('Default categories are ready.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
