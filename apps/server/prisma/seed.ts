import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { GroupRole, SplitType } from '../src/generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Kharcha database...\n');

  // ─── Clean existing data (order matters for FK constraints) ───
  await prisma.notification.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.group.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log('  Cleaned existing data');

  // ─── Create demo users ───
  // Hash generated at seed time with bcrypt cost 12
  const passwordHash = await bcrypt.hash('password123', 12);

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: 'Marcus Chen',
      email: 'marcus@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const sana = await prisma.user.create({
    data: {
      name: 'Sana Patel',
      email: 'sana@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const dev = await prisma.user.create({
    data: {
      name: 'Dev Garg',
      email: 'dev@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  console.log(
    `  Created 4 users: ${priya.name}, ${marcus.name}, ${sana.name}, ${dev.name}`,
  );

  // ─── Create demo groups ───

  const goaTrip = await prisma.group.create({
    data: {
      name: 'Goa Trip 2026',
      description: 'Annual beach trip with friends — March 2026',
      createdById: priya.id,
      inviteCode: 'GOA2026ABCD',
    },
  });

  const flat4b = await prisma.group.create({
    data: {
      name: 'Flat 4B',
      description: 'Monthly household expenses',
      createdById: sana.id,
      inviteCode: 'FLAT4B2026X',
    },
  });

  console.log(`  Created 2 groups: "${goaTrip.name}", "${flat4b.name}"`);

  // ─── Add members ───

  await prisma.groupMember.createMany({
    data: [
      { groupId: goaTrip.id, userId: priya.id, role: GroupRole.ADMIN },
      { groupId: goaTrip.id, userId: marcus.id, role: GroupRole.MEMBER },
      { groupId: goaTrip.id, userId: sana.id, role: GroupRole.MEMBER },
      { groupId: goaTrip.id, userId: dev.id, role: GroupRole.MEMBER },
    ],
  });

  await prisma.groupMember.createMany({
    data: [
      { groupId: flat4b.id, userId: sana.id, role: GroupRole.ADMIN },
      { groupId: flat4b.id, userId: priya.id, role: GroupRole.MEMBER },
      { groupId: flat4b.id, userId: marcus.id, role: GroupRole.MEMBER },
    ],
  });

  console.log('  Added members to groups');

  // ─── Goa Trip expenses ───

  // Expense 1: Dinner — EQUAL split, 4 people, Rs 3,500
  const dinner = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: priya.id,
      amountInPaise: 350000,
      description: 'Dinner at Olive Bar & Kitchen',
      category: 'food',
      tags: ['dining', 'goa'],
      splitType: SplitType.EQUAL,
      date: new Date('2026-03-25'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: dinner.id, userId: priya.id, owedAmountInPaise: 87500 },
      { expenseId: dinner.id, userId: marcus.id, owedAmountInPaise: 87500 },
      { expenseId: dinner.id, userId: sana.id, owedAmountInPaise: 87500 },
      { expenseId: dinner.id, userId: dev.id, owedAmountInPaise: 87500 },
    ],
  });

  // Expense 2: Hotel — EQUAL split, 4 people, Rs 12,000
  const hotel = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: marcus.id,
      amountInPaise: 1200000,
      description: 'Hotel Mandovi — 2 nights',
      category: 'accommodation',
      tags: ['hotel', 'goa'],
      splitType: SplitType.EQUAL,
      date: new Date('2026-03-24'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: hotel.id, userId: priya.id, owedAmountInPaise: 300000 },
      { expenseId: hotel.id, userId: marcus.id, owedAmountInPaise: 300000 },
      { expenseId: hotel.id, userId: sana.id, owedAmountInPaise: 300000 },
      { expenseId: hotel.id, userId: dev.id, owedAmountInPaise: 300000 },
    ],
  });

  // Expense 3: Cab — SHARES 2:1:1, 3 people, Rs 800
  const cab = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: sana.id,
      amountInPaise: 80000,
      description: 'Airport cab (Dabolim to Panaji)',
      category: 'transport',
      tags: ['cab', 'goa'],
      splitType: SplitType.SHARES,
      date: new Date('2026-03-24'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      {
        expenseId: cab.id,
        userId: priya.id,
        owedAmountInPaise: 40000,
        shareValue: 2,
      },
      {
        expenseId: cab.id,
        userId: marcus.id,
        owedAmountInPaise: 20000,
        shareValue: 1,
      },
      {
        expenseId: cab.id,
        userId: sana.id,
        owedAmountInPaise: 20000,
        shareValue: 1,
      },
    ],
  });

  // Expense 4: Groceries — PERCENTAGE, 4 people, Rs 2,100
  const groceries = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: dev.id,
      amountInPaise: 210000,
      description: 'Groceries from Delfinos',
      category: 'groceries',
      tags: ['food', 'goa'],
      splitType: SplitType.PERCENTAGE,
      date: new Date('2026-03-26'),
    },
  });

  // 40% + 30% + 20% + 10% = 100%
  // 84000 + 63000 + 42000 + 21000 = 210000
  await prisma.expenseSplit.createMany({
    data: [
      {
        expenseId: groceries.id,
        userId: priya.id,
        owedAmountInPaise: 84000,
        shareValue: 40,
      },
      {
        expenseId: groceries.id,
        userId: marcus.id,
        owedAmountInPaise: 63000,
        shareValue: 30,
      },
      {
        expenseId: groceries.id,
        userId: sana.id,
        owedAmountInPaise: 42000,
        shareValue: 20,
      },
      {
        expenseId: groceries.id,
        userId: dev.id,
        owedAmountInPaise: 21000,
        shareValue: 10,
      },
    ],
  });

  // Expense 5: Scuba — EXACT, 3 people, Rs 5,000
  const scuba = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: priya.id,
      amountInPaise: 500000,
      description: 'Scuba diving for 3 (Dev opted out)',
      category: 'entertainment',
      tags: ['activity', 'goa'],
      splitType: SplitType.EXACT,
      date: new Date('2026-03-26'),
    },
  });

  // 200000 + 150000 + 150000 = 500000
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: scuba.id, userId: priya.id, owedAmountInPaise: 200000 },
      { expenseId: scuba.id, userId: marcus.id, owedAmountInPaise: 150000 },
      { expenseId: scuba.id, userId: sana.id, owedAmountInPaise: 150000 },
    ],
  });

  console.log('  Created 5 expenses (EQUAL, EQUAL, SHARES, PERCENTAGE, EXACT)');

  // ─── Flat 4B expenses ───

  const rent = await prisma.expense.create({
    data: {
      groupId: flat4b.id,
      paidById: sana.id,
      amountInPaise: 4500000,
      description: 'March 2026 rent',
      category: 'rent',
      splitType: SplitType.EQUAL,
      date: new Date('2026-03-01'),
      isRecurring: true,
      recurrenceRule: 'FREQ=MONTHLY',
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: rent.id, userId: sana.id, owedAmountInPaise: 1500000 },
      { expenseId: rent.id, userId: priya.id, owedAmountInPaise: 1500000 },
      { expenseId: rent.id, userId: marcus.id, owedAmountInPaise: 1500000 },
    ],
  });

  const wifi = await prisma.expense.create({
    data: {
      groupId: flat4b.id,
      paidById: marcus.id,
      amountInPaise: 150000,
      description: 'WiFi bill — March',
      category: 'utilities',
      splitType: SplitType.EQUAL,
      date: new Date('2026-03-05'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: wifi.id, userId: sana.id, owedAmountInPaise: 50000 },
      { expenseId: wifi.id, userId: priya.id, owedAmountInPaise: 50000 },
      { expenseId: wifi.id, userId: marcus.id, owedAmountInPaise: 50000 },
    ],
  });

  console.log('  Created 2 expenses for Flat 4B (including 1 recurring)');

  // ─── Settlements ───

  const settlement1 = await prisma.settlement.create({
    data: {
      groupId: goaTrip.id,
      paidById: dev.id,
      paidToId: priya.id,
      amountInPaise: 200000,
      note: 'Partial settlement for Goa trip expenses',
    },
  });

  const settlement2 = await prisma.settlement.create({
    data: {
      groupId: flat4b.id,
      paidById: priya.id,
      paidToId: sana.id,
      amountInPaise: 1500000,
      note: 'March rent share',
    },
  });

  console.log('  Created 2 settlements');

  // ─── Notifications ───

  await prisma.notification.createMany({
    data: [
      {
        userId: marcus.id,
        type: 'EXPENSE_ADDED',
        title: 'New expense added',
        body: 'Priya added "Dinner at Olive Bar & Kitchen" — you owe Rs 875.00',
        metadata: { groupId: goaTrip.id, expenseId: dinner.id },
        isRead: false,
      },
      {
        userId: sana.id,
        type: 'EXPENSE_ADDED',
        title: 'New expense added',
        body: 'Priya added "Dinner at Olive Bar & Kitchen" — you owe Rs 875.00',
        metadata: { groupId: goaTrip.id, expenseId: dinner.id },
        isRead: true,
      },
      {
        userId: priya.id,
        type: 'SETTLEMENT_RECEIVED',
        title: 'Settlement received',
        body: 'Dev settled Rs 2,000.00 with you',
        metadata: { groupId: goaTrip.id, settlementId: settlement1.id },
        isRead: false,
      },
    ],
  });

  console.log('  Created 3 notifications');

  // ─── Summary ───

  console.log('\nSeed complete!\n');
  console.log('  Demo credentials (all users):');
  console.log('    Password: password123\n');
  console.log('  Users:');
  console.log(
    `    ${priya.email}  (Admin of Goa Trip, Member of Flat 4B)`,
  );
  console.log(`    ${marcus.email} (Member of both groups)`);
  console.log(
    `    ${sana.email}   (Member of Goa Trip, Admin of Flat 4B)`,
  );
  console.log(`    ${dev.email}     (Member of Goa Trip only)\n`);
  console.log('  Groups:');
  console.log(
    `    "${goaTrip.name}" — invite: ${goaTrip.inviteCode} — 5 expenses, 1 settlement`,
  );
  console.log(
    `    "${flat4b.name}"  — invite: ${flat4b.inviteCode} — 2 expenses, 1 settlement`,
  );

  // ─── Integrity checks ───

  console.log('\nRunning integrity checks...');

  const expenses = await prisma.expense.findMany({
    include: { splits: true },
  });

  for (const exp of expenses) {
    const splitSum = exp.splits.reduce(
      (sum, s) => sum + s.owedAmountInPaise,
      0,
    );
    if (splitSum !== exp.amountInPaise) {
      console.error(
        `  FAIL: Expense "${exp.description}" total=${exp.amountInPaise} but splits sum=${splitSum}`,
      );
      process.exit(1);
    }
  }
  console.log(`  All ${expenses.length} expenses pass zero-sum split check`);

  for (const exp of expenses) {
    if (!Number.isInteger(exp.amountInPaise) || exp.amountInPaise <= 0) {
      console.error(
        `  FAIL: Expense "${exp.description}" has invalid amount: ${exp.amountInPaise}`,
      );
      process.exit(1);
    }
    for (const split of exp.splits) {
      if (
        !Number.isInteger(split.owedAmountInPaise) ||
        split.owedAmountInPaise <= 0
      ) {
        console.error(
          `  FAIL: Split in "${exp.description}" has invalid owed amount: ${split.owedAmountInPaise}`,
        );
        process.exit(1);
      }
    }
  }
  console.log('  All amounts are positive integers (paise)');

  console.log('\nAll checks passed!\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
