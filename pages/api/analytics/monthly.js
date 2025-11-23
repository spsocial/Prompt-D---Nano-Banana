// API endpoint for fetching monthly revenue analytics
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { months = '12' } = req.query; // Default to last 12 months

    // Fetch all monthly stats, ordered by month descending
    const monthlyStats = await prisma.monthlyStats.findMany({
      orderBy: {
        month: 'desc'
      },
      take: parseInt(months)
    });

    // Get transactions for each month to calculate actual revenue (excluding free credits)
    const monthlyData = await Promise.all(monthlyStats.map(async (stat) => {
      // Parse month string (format: "2025-01")
      const [year, month] = stat.month.split('-');
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      // Get transactions for this month
      const transactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      // Calculate actual revenue (exclude free credits)
      let revenue = 0;
      let paidTransactions = 0;

      transactions.forEach(t => {
        if (!t.packageName?.includes('ฟรี') &&
            !t.packageName?.toLowerCase().includes('free')) {
          revenue += t.amount || 0;
          paidTransactions++;
        }
      });

      // Get daily stats for this month
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      // Aggregate stats from daily data (use ACTUAL API costs)
      const totals = {
        images: 0,
        videos: 0,
        videosSora2: 0,
        videoErrors: 0,
        voices: 0,
        imageCost: 0,  // Track actual image costs
        videoCost: 0   // Track actual video costs
      };

      dailyStats.forEach(day => {
        totals.images += day.totalImages || 0;
        totals.videos += day.totalVideos || 0;
        totals.videosSora2 += day.videosSora2 || 0;
        totals.videoErrors += day.videoErrors || 0;
        totals.voices += day.totalVoices || 0;
        // Use ACTUAL API costs from database
        totals.imageCost += day.apiCostImages || 0;
        totals.videoCost += day.apiCostVideos || 0;
      });

      // Calculate NEW USERS for this month from User.firstSeen (more accurate)
      const newUsersCount = await prisma.user.count({
        where: {
          firstSeen: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      totals.newUsers = newUsersCount;

      // Calculate total cost from actual tracked costs
      const totalCost = totals.imageCost + totals.videoCost;

      // Calculate profit (revenue - cost, only for paid transactions)
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

      return {
        month: stat.month,
        revenue,
        transactions: paidTransactions,
        cost: totalCost,
        profit,
        profitMargin,
        ...totals
      };
    }));

    return res.status(200).json({
      months: monthlyData.reverse() // Reverse to show oldest first
    });

  } catch (error) {
    console.error('Error fetching monthly data:', error);
    return res.status(500).json({ error: 'Failed to fetch monthly data' });
  }
}
