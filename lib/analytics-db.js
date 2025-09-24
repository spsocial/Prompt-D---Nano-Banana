// Analytics using PostgreSQL database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track unique user
export const trackUser = async (userId) => {
  try {
    // Upsert user (create if not exists, update if exists)
    const user = await prisma.user.upsert({
      where: { userId },
      update: {
        lastActive: new Date()
      },
      create: {
        userId,
        firstSeen: new Date(),
        lastActive: new Date()
      }
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        activeUsers: {
          increment: 0 // Will be calculated separately
        }
      },
      create: {
        date: today,
        newUsers: 1,
        activeUsers: 1
      }
    });

    // Count total users
    const totalUsers = await prisma.user.count();
    return totalUsers;
  } catch (error) {
    console.error('Error tracking user:', error);
    return 0;
  }
};

// Track payment/top-up
export const trackPayment = async (userId, amount, packageName, transactionId) => {
  try {
    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        transactionId: transactionId || `TXN-${Date.now()}`,
        userId,
        amount,
        packageName,
        status: 'completed'
      }
    });

    // Update user's total spent
    await prisma.user.update({
      where: { userId },
      data: {
        totalSpent: {
          increment: amount
        }
      }
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        totalRevenue: {
          increment: amount
        },
        totalTransactions: {
          increment: 1
        }
      },
      create: {
        date: today,
        totalRevenue: amount,
        totalTransactions: 1
      }
    });

    // Update monthly stats
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    await prisma.monthlyStats.upsert({
      where: { month },
      update: {
        totalRevenue: {
          increment: amount
        },
        totalTransactions: {
          increment: 1
        }
      },
      create: {
        month,
        totalRevenue: amount,
        totalTransactions: 1
      }
    });

    return transaction;
  } catch (error) {
    console.error('Error tracking payment:', error);
    return null;
  }
};

// Track image generation
export const trackImageGeneration = async (userId, style, prompt = null) => {
  try {
    // Create image generation record
    await prisma.imageGeneration.create({
      data: {
        userId,
        style,
        prompt
      }
    });

    // Update user's total generated
    await prisma.user.update({
      where: { userId },
      data: {
        totalGenerated: {
          increment: 1
        },
        lastActive: new Date()
      }
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        totalImages: {
          increment: 1
        }
      },
      create: {
        date: today,
        totalImages: 1
      }
    });

    // Update monthly stats
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    await prisma.monthlyStats.upsert({
      where: { month },
      update: {
        totalImages: {
          increment: 1
        }
      },
      create: {
        month,
        totalImages: 1
      }
    });

    return true;
  } catch (error) {
    console.error('Error tracking image generation:', error);
    return false;
  }
};

// Get analytics summary
export const getAnalyticsSummary = async () => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = now.getFullYear();

    // Get user statistics
    const totalUsers = await prisma.user.count();
    const activeToday = await prisma.user.count({
      where: { lastActive: { gte: dayAgo } }
    });
    const activeWeek = await prisma.user.count({
      where: { lastActive: { gte: weekAgo } }
    });
    const activeMonth = await prisma.user.count({
      where: { lastActive: { gte: monthAgo } }
    });

    // Get today's stats
    const todayStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    });

    // Get new users today
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get revenue statistics
    const totalRevenue = await prisma.transaction.aggregate({
      _sum: { amount: true }
    });

    const todayRevenue = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      _sum: { amount: true },
      _count: true
    });

    // Get monthly revenue
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: monthStart }
      },
      _sum: { amount: true },
      _count: true
    });

    // Get yearly revenue
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearRevenue = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: yearStart }
      },
      _sum: { amount: true }
    });

    // Get today's images count
    const todayImages = await prisma.imageGeneration.count({
      where: {
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get style breakdown for today
    const styleBreakdown = await prisma.imageGeneration.groupBy({
      by: ['style'],
      where: {
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      _count: true
    });

    const styleBreakdownObj = {};
    styleBreakdown.forEach(item => {
      styleBreakdownObj[item.style] = item._count;
    });

    // Get top users
    const topUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { totalGenerated: 'desc' },
      select: {
        userId: true,
        totalGenerated: true,
        totalSpent: true,
        lastActive: true
      }
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        transactionId: true,
        userId: true,
        amount: true,
        packageName: true,
        createdAt: true
      }
    });

    return {
      users: {
        total: totalUsers,
        activeToday,
        activeWeek,
        activeMonth,
        newToday: newUsersToday
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        today: todayRevenue._sum.amount || 0,
        month: monthRevenue._sum.amount || 0,
        year: yearRevenue._sum.amount || 0,
        transactionsToday: todayRevenue._count || 0,
        transactionsMonth: monthRevenue._count || 0
      },
      images: {
        today: todayImages,
        styleBreakdown: styleBreakdownObj
      },
      topUsers: topUsers.map(u => ({
        id: u.userId,
        generated: u.totalGenerated,
        spent: u.totalSpent,
        lastActive: u.lastActive.toISOString()
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.transactionId,
        userId: t.userId,
        amount: t.amount,
        package: t.packageName,
        timestamp: t.createdAt.toISOString()
      }))
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
};

// Get detailed stats for date range
export const getDetailedStats = async (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const uniqueUsers = [...new Set(transactions.map(t => t.userId))];

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: { date: 'asc' }
    });

    return {
      dateRange: {
        start: startDate,
        end: endDate
      },
      revenue: {
        total: revenue,
        transactions: transactions.length,
        averageTransaction: transactions.length > 0 ? revenue / transactions.length : 0,
        uniqueUsers: uniqueUsers.length
      },
      transactions,
      dailyBreakdown: dailyStats
    };
  } catch (error) {
    console.error('Error getting detailed stats:', error);
    return null;
  }
};

// Export data for backup
export const exportAnalyticsData = async () => {
  try {
    const [users, transactions, images, dailyStats, monthlyStats] = await Promise.all([
      prisma.user.findMany(),
      prisma.transaction.findMany(),
      prisma.imageGeneration.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }),
      prisma.dailyStats.findMany({ orderBy: { date: 'desc' } }),
      prisma.monthlyStats.findMany({ orderBy: { month: 'desc' } })
    ]);

    return {
      exportDate: new Date().toISOString(),
      data: {
        users,
        transactions,
        images,
        dailyStats,
        monthlyStats
      }
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
};

// Clean old data (keep last 90 days)
export const cleanOldData = async () => {
  try {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Delete old image generation records
    await prisma.imageGeneration.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    // Keep all transactions for financial records
    // Delete old daily stats
    await prisma.dailyStats.deleteMany({
      where: {
        date: { lt: cutoffDate }
      }
    });

    return true;
  } catch (error) {
    console.error('Error cleaning old data:', error);
    return false;
  }
};