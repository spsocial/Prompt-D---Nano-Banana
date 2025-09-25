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

    // Separate free and paid credits based on package name
    let freeCredits = 0;
    let paidCredits = 0;
    let todayRevenue = 0; // Actual money revenue (not free credits)

    todayTransactions.forEach(transaction => {
      // Check if it's a free credit transaction
      const isFreeCredit = transaction.packageName?.toLowerCase().includes('free') ||
                           transaction.packageName?.includes('ฟรี');

      if (isFreeCredit) {
        freeCredits += transaction.amount; // Count as free credits
        // Don't add to revenue
      } else {
        paidCredits += transaction.amount; // Count as paid credits
        // Only paid credits count as revenue
        todayRevenue += transaction.amount;
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
    let weekRevenue = 0;

    weekTransactions.forEach(transaction => {
      const isFreeCredit = transaction.packageName?.toLowerCase().includes('free') ||
                           transaction.packageName?.includes('ฟรี');

      if (isFreeCredit) {
        weekFreeCredits += transaction.amount;
      } else {
        weekPaidCredits += transaction.amount;
        weekRevenue += transaction.amount;
      }
    });

    return res.status(200).json({
      todayTotal: freeCredits + paidCredits,
      todayCount: todayTransactions.length,
      freeCredits,
      paidCredits,
      todayRevenue,  // Actual revenue (paid credits only)
      weekTotal: weekFreeCredits + weekPaidCredits,
      weekFreeCredits,
      weekPaidCredits,
      weekRevenue,    // Week revenue (paid credits only)
      allTimeTotal: allTransactions._sum.amount || 0
    });

  } catch (error) {
    console.error('Error fetching credit stats:', error);
    return res.status(500).json({ error: 'Failed to fetch credit statistics' });
  }
}