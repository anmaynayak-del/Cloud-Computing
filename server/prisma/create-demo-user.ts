import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo123', 10);
  
  // Create or update user with name="name", email="name@example.com", password="demo123"
  const user1 = await prisma.user.upsert({
    where: { email: 'name@example.com' },
    update: {
      name: 'name',
      passwordHash,
    },
    create: {
      email: 'name@example.com',
      name: 'name',
      passwordHash,
    },
  });
  console.log('Upserted user:', user1.email, user1.name);

  // Also upsert user with email="name" in case user enters "name" directly
  const user2 = await prisma.user.upsert({
    where: { email: 'name' },
    update: {
      name: 'name',
      passwordHash,
    },
    create: {
      email: 'name',
      name: 'name',
      passwordHash,
    },
  }).catch((e) => {
    console.log('Skipping email=name if constraint prohibits:', e.message);
  });
  if (user2) console.log('Upserted user with email=name');

  // Let's also ensure this user has a default account and some starter data so the dashboard is beautiful
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user1.id },
  });

  if (!existingAccount) {
    const checking = await prisma.account.create({
      data: {
        userId: user1.id,
        name: 'Primary Checking',
        type: 'DEPOSITORY',
        balance: 45000,
        currency: 'INR',
      },
    });

    const savings = await prisma.account.create({
      data: {
        userId: user1.id,
        name: 'Savings Account',
        type: 'INVESTMENT',
        balance: 125000,
        currency: 'INR',
      },
    });

    // Add some sample categories
    const foodCat = await prisma.category.findFirst({ where: { name: 'Food', type: 'EXPENSE' } });
    const salaryCat = await prisma.category.findFirst({ where: { name: 'Salary', type: 'INCOME' } });

    if (salaryCat) {
      await prisma.transaction.create({
        data: {
          accountId: checking.id,
          amount: 85000,
          type: 'INCOME',
          categoryId: salaryCat.id,
          date: new Date(),
          description: 'Monthly Salary',
        },
      });
    }

    if (foodCat) {
      await prisma.transaction.create({
        data: {
          accountId: checking.id,
          amount: 2500,
          type: 'EXPENSE',
          categoryId: foodCat.id,
          date: new Date(),
          description: 'Grocery & Supplies',
        },
      });
    }

    console.log('Created sample accounts and transactions for demo user!');
  }
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
