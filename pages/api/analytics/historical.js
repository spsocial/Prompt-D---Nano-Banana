// API endpoint for fetching historical analytics data
import { PrismaClient } from '@prisma/client';
import { getThailandToday, getThailandDaysAgo } from '../../../lib/timezone.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { range = '7' } = req.query; // Default to last 7 days

    // Use Thailand timezone
    const today = getThailandToday();

    let startDate;
    let daysToFetch;

    if (range === 'all') {
      // Fetch all available data (limit to 90 days for performance)
      daysToFetch = 90;
      startDate = getThailandDaysAgo(90);
    } else {
      daysToFetch = parseInt(range);
      startDate = getThailandDaysAgo(daysToFetch);
    }

    // Fetch daily stats for the range
    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: startDate,
          lte: today
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Aggregate totals for the period (only Sora 2 now)
    const totals = {
      images: 0,
      videos: 0,
      videosSora2: 0,
      videoErrors: 0,
      revenue: 0,
      transactions: 0,
      newUsers: 0
    };

    dailyStats.forEach(stat => {
      totals.images += stat.totalImages || 0;
      totals.videos += stat.totalVideos || 0;
      totals.videosSora2 += stat.videosSora2 || 0;
      totals.videoErrors += stat.videoErrors || 0;
      totals.revenue += stat.totalRevenue || 0;
      totals.transactions += stat.totalTransactions || 0;
      totals.newUsers += stat.newUsers || 0;
    });

    // Calculate newUsers and ACTUAL revenue for each day (more accurate than dailyStats)
    const chartDataWithUsers = await Promise.all(dailyStats.map(async (stat) => {
      const images = stat.totalImages || 0;
      const videos = stat.totalVideos || 0;

      // Calculate day boundaries
      const dayStart = new Date(stat.date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Calculate ACTUAL REVENUE from transactions (exclude free credits)
      const dayTransactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd
          }
        }
      });

      let actualRevenue = 0;
      let paidTransactionCount = 0;

      dayTransactions.forEach(t => {
        // Skip free credit transactions
        if (!t.packageName?.includes('ฟรี') &&
            !t.packageName?.toLowerCase().includes('free')) {
          actualRevenue += t.amount || 0;
          paidTransactionCount++;
        }
      });

      // Use ACTUAL API costs from database (tracked during generation)
      const imageCost = stat.apiCostImages || 0;  // Real cost from Nano Banana API
      const videoCost = stat.apiCostVideos || 0;  // Real cost from KIE Sora 2 API (5.1฿)
      const totalCost = imageCost + videoCost;

      // Calculate daily profit using ACTUAL revenue
      const profit = actualRevenue - totalCost;

      // Calculate NEW USERS for this specific day from User.firstSeen
      const newUsersCount = await prisma.user.count({
        where: {
          firstSeen: {
            gte: dayStart,
            lt: dayEnd
          }
        }
      });

      return {
        date: stat.date.toISOString().split('T')[0],
        images,
        videos,
        videosSora2: stat.videosSora2 || 0,
        videoErrors: stat.videoErrors || 0,
        revenue: actualRevenue,  // Use ACTUAL revenue from transactions (exclude free)
        cost: totalCost,
        imageCost,  // Show individual costs for transparency
        videoCost,
        profit,
        transactions: paidTransactionCount,  // Only count paid transactions
        newUsers: newUsersCount  // Calculated from actual User.firstSeen data
      };
    }));

    const chartData = chartDataWithUsers;

    return res.status(200).json({
      range: range === 'all' ? 'all' : `${daysToFetch} days`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      totals,
      chartData
    });

  } catch (error) {
    console.error('Error fetching historical data:', error);
    return res.status(500).json({ error: 'Failed to fetch historical data' });
  }
}
