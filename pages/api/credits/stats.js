import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all transactions for today
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Separate free and paid credits based on package name or amount
    let freeCredits = 0;
    let paidCredits = 0;

    todayTransactions.forEach(transaction => {
      // Assume transactions with "ฟรี" or "free" in package name are free credits
      // Or transactions with amount 0 are free
      if (transaction.packageName?.toLowerCase().includes('free') ||
          transaction.packageName?.includes('ฟรี') ||
          transaction.amount === 0) {
        freeCredits += transaction.amount;
      } else {
        paidCredits += transaction.amount;
      }
    });

    // Get total credits added all time
    const allTransactions = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      }
    });

    // Get weekly stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    });

    let weekFreeCredits = 0;
    let weekPaidCredits = 0;

    weekTransactions.forEach(transaction => {
      if (transaction.packageName?.toLowerCase().includes('free') ||
          transaction.packageName?.includes('ฟรี') ||
          transaction.amount === 0) {
        weekFreeCredits += transaction.amount;
      } else {
        weekPaidCredits += transaction.amount;
      }
    });

    return res.status(200).json({
      todayTotal: freeCredits + paidCredits,
      todayCount: todayTransactions.length,
      freeCredits,
      paidCredits,
      weekTotal: weekFreeCredits + weekPaidCredits,
      weekFreeCredits,
      weekPaidCredits,
      allTimeTotal: allTransactions._sum.amount || 0
    });

  } catch (error) {
    console.error('Error fetching credit stats:', error);
    return res.status(500).json({ error: 'Failed to fetch credit statistics' });
  }
}