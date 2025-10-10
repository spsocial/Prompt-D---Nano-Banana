// API endpoint for fetching historical analytics data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { range = '7' } = req.query; // Default to last 7 days

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate;
    let daysToFetch;

    if (range === 'all') {
      // Fetch all available data (limit to 90 days for performance)
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      daysToFetch = 90;
    } else {
      daysToFetch = parseInt(range);
      startDate = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000);
    }

    startDate.setHours(0, 0, 0, 0);

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

    // Aggregate totals for the period
    const totals = {
      images: 0,
      videos: 0,
      videosSora2: 0,
      videosSora2HD: 0,
      videosVeo3: 0,
      videoErrors: 0,
      revenue: 0,
      transactions: 0,
      newUsers: 0
    };

    dailyStats.forEach(stat => {
      totals.images += stat.totalImages || 0;
      totals.videos += stat.totalVideos || 0;
      totals.videosSora2 += stat.videosSora2 || 0;
      totals.videosSora2HD += stat.videosSora2HD || 0;
      totals.videosVeo3 += stat.videosVeo3 || 0;
      totals.videoErrors += stat.videoErrors || 0;
      totals.revenue += stat.totalRevenue || 0;
      totals.transactions += stat.totalTransactions || 0;
      totals.newUsers += stat.newUsers || 0;
    });

    // Format data for charts
    const chartData = dailyStats.map(stat => ({
      date: stat.date.toISOString().split('T')[0],
      images: stat.totalImages || 0,
      videos: stat.totalVideos || 0,
      videosSora2: stat.videosSora2 || 0,
      videosSora2HD: stat.videosSora2HD || 0,
      videosVeo3: stat.videosVeo3 || 0,
      videoErrors: stat.videoErrors || 0,
      revenue: stat.totalRevenue || 0,
      transactions: stat.totalTransactions || 0,
      newUsers: stat.newUsers || 0
    }));

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
