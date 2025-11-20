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

    // Format data for charts (use actual API costs from database)
    const chartData = dailyStats.map(stat => {
      const images = stat.totalImages || 0;
      const videos = stat.totalVideos || 0;
      const revenue = stat.totalRevenue || 0;

      // Use ACTUAL API costs from database (tracked during generation)
      const imageCost = stat.apiCostImages || 0;  // Real cost from Nano Banana API
      const videoCost = stat.apiCostVideos || 0;  // Real cost from KIE Sora 2 API (5.1฿)
      const totalCost = imageCost + videoCost;

      // Calculate daily profit
      const profit = revenue - totalCost;

      return {
        date: stat.date.toISOString().split('T')[0],
        images,
        videos,
        videosSora2: stat.videosSora2 || 0,
        videoErrors: stat.videoErrors || 0,
        revenue,
        cost: totalCost,
        imageCost,  // Show individual costs for transparency
        videoCost,
        profit,
        transactions: stat.totalTransactions || 0,
        newUsers: stat.newUsers || 0
      };
    });

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
