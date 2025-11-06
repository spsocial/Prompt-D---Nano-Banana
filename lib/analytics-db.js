// Analytics using PostgreSQL database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track unique user
export const trackUser = async (userId) => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { userId }
    });

    const isNewUser = !existingUser;

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

    // Get current daily stats
    const currentStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    });

    if (!currentStats) {
      // Create new daily stats entry
      await prisma.dailyStats.create({
        data: {
          date: today,
          newUsers: isNewUser ? 1 : 0,
          activeUsers: 1,
          totalRevenue: 0,
          totalTransactions: 0,
          totalImages: 0
        }
      });
    } else {
      // Update existing stats - increment new users only if this is a new user
      await prisma.dailyStats.update({
        where: { date: today },
        data: {
          newUsers: isNewUser ? currentStats.newUsers + 1 : currentStats.newUsers,
          // Active users will be calculated separately in the summary
        }
      });
    }

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
    // Parse count from prompt if it contains "Generated X images"
    let imageCount = 1;
    if (prompt && prompt.includes('Generated')) {
      const match = prompt.match(/Generated (\d+) images/);
      if (match) {
        imageCount = parseInt(match[1]) || 1;
      }
    }

    console.log(`Tracking image generation: userId=${userId}, style=${style}, count=${imageCount}, prompt=${prompt}`);

    // Create ONE image generation record with the count
    await prisma.imageGeneration.create({
      data: {
        userId,
        style,
        prompt
      }
    });

    // Update user's total generated and credits used
    await prisma.user.update({
      where: { userId },
      data: {
        totalGenerated: {
          increment: imageCount
        },
        creditsUsed: {
          increment: imageCount  // Each image costs 1 credit
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
          increment: imageCount
        }
      },
      create: {
        date: today,
        totalImages: imageCount
      }
    });

    // Update monthly stats
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    await prisma.monthlyStats.upsert({
      where: { month },
      update: {
        totalImages: {
          increment: imageCount
        }
      },
      create: {
        month,
        totalImages: imageCount
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

    // Get user statistics with proper date filtering
    const totalUsers = await prisma.user.count();

    // Count distinct users active in different periods
    const activeToday = await prisma.user.count({
      where: {
        lastActive: {
          gte: dayAgo,
          lte: now
        }
      }
    });

    const activeWeek = await prisma.user.count({
      where: {
        lastActive: {
          gte: weekAgo,
          lte: now
        }
      }
    });

    const activeMonth = await prisma.user.count({
      where: {
        lastActive: {
          gte: monthAgo,
          lte: now
        }
      }
    });

    // Get today's stats
    const todayStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    });

    // Calculate today's active users count
    const todayActiveUsers = await prisma.user.count({
      where: {
        lastActive: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get new users today - using firstSeen field instead of createdAt
    const newUsersToday = await prisma.user.count({
      where: {
        firstSeen: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get total revenue statistics (exclude free credits)
    const allTransactions = await prisma.transaction.findMany();
    let totalRevenue = 0;

    allTransactions.forEach(t => {
      if (!t.packageName?.includes('ฟรี') &&
          !t.packageName?.toLowerCase().includes('free')) {
        totalRevenue += t.amount || 0;
      }
    });

    // Get today's revenue (exclude free credits)
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Calculate actual revenue (exclude free credits)
    let todayRevenue = 0;
    let todayPaidTransactionCount = 0;

    todayTransactions.forEach(t => {
      // Skip free credit transactions
      if (!t.packageName?.includes('ฟรี') &&
          !t.packageName?.toLowerCase().includes('free')) {
        todayRevenue += t.amount || 0;
        todayPaidTransactionCount++;
      }
    });

    // Get monthly revenue (exclude free credits)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: monthStart }
      }
    });

    let monthRevenue = 0;
    let monthPaidTransactionCount = 0;

    monthTransactions.forEach(t => {
      if (!t.packageName?.includes('ฟรี') &&
          !t.packageName?.toLowerCase().includes('free')) {
        monthRevenue += t.amount || 0;
        monthPaidTransactionCount++;
      }
    });

    // Get yearly revenue (exclude free credits)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: yearStart }
      }
    });

    let yearRevenue = 0;
    yearTransactions.forEach(t => {
      if (!t.packageName?.includes('ฟรี') &&
          !t.packageName?.toLowerCase().includes('free')) {
        yearRevenue += t.amount || 0;
      }
    });

    // Get today's images count from daily stats (which tracks actual count)
    const todayImagesStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    });
    const todayImages = todayImagesStats?.totalImages || 0;

    // Get style breakdown for today with actual counts
    const todayImageGenerations = await prisma.imageGeneration.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Process style breakdown - merge similar styles and count actual images
    const styleBreakdownObj = {};
    todayImageGenerations.forEach(record => {
      // Parse actual count from prompt
      let actualCount = 1;
      if (record.prompt && record.prompt.includes('Generated')) {
        const match = record.prompt.match(/Generated (\d+) images/);
        if (match) {
          actualCount = parseInt(match[1]) || 1;
        }
      }

      // Clean up style name
      let cleanStyle = record.style;
      if (cleanStyle) {
        // Remove style variations like "3D Cinematic - สไตล์ 1"
        cleanStyle = cleanStyle.replace(/ - สไตล์ \d+/g, '');

        // Map common style names (keep Thai names)
        if (cleanStyle.includes('3D Cinematic')) {
          cleanStyle = '3D Cinematic';
        } else if (cleanStyle.includes('ลอยในอากาศ')) {
          cleanStyle = 'ลอยในอากาศ';
        } else if (cleanStyle.includes('โทนภาพ Moody')) {
          cleanStyle = 'โทนภาพ Moody';
        } else if (cleanStyle.includes('พรีเมี่ยม')) {
          cleanStyle = 'พรีเมี่ยม';
        } else if (cleanStyle.includes('Product Hero')) {
          cleanStyle = 'Product Hero';
        } else if (cleanStyle.toLowerCase() === 'floating') {
          cleanStyle = 'ลอยในอากาศ';
        } else if (cleanStyle.toLowerCase() === 'moody') {
          cleanStyle = 'โทนภาพ Moody';
        } else if (cleanStyle.toLowerCase() === 'premium') {
          cleanStyle = 'พรีเมี่ยม';
        } else if (cleanStyle.toLowerCase() === 'cinematic') {
          cleanStyle = '3D Cinematic';
        } else if (cleanStyle.toLowerCase() === 'producthero') {
          cleanStyle = 'Product Hero';
        }

        // Add actual count (not just 1)
        if (styleBreakdownObj[cleanStyle]) {
          styleBreakdownObj[cleanStyle] += actualCount;
        } else {
          styleBreakdownObj[cleanStyle] = actualCount;
        }
      }
    });

    // Get today's videos count from daily stats
    const todayVideosStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    });
    const todayVideos = todayVideosStats?.totalVideos || 0;
    const todayVideosSora2 = todayVideosStats?.videosSora2 || 0;
    const todayVideosSora2HD = todayVideosStats?.videosSora2HD || 0;
    const todayVideosVeo3 = todayVideosStats?.videosVeo3 || 0;
    const todayVideoErrors = todayVideosStats?.videoErrors || 0;

    // Get video model breakdown for today
    const videoModelBreakdown = {
      'Sora 2': todayVideosSora2,
      'Sora 2 HD': todayVideosSora2HD,
      'Veo3': todayVideosVeo3
    };

    // Get top users (include video stats)
    const topUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { totalGenerated: 'desc' },
      select: {
        userId: true,
        totalGenerated: true,
        videosGenerated: true,
        totalSpent: true,
        creditsUsed: true,
        videoCreditsUsed: true,
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
        total: totalRevenue,
        today: todayRevenue,
        month: monthRevenue,
        year: yearRevenue,
        transactionsToday: todayPaidTransactionCount,
        transactionsMonth: monthPaidTransactionCount
      },
      images: {
        today: todayImages,
        styleBreakdown: styleBreakdownObj
      },
      videos: {
        today: todayVideos,
        modelBreakdown: videoModelBreakdown,
        errors: todayVideoErrors
      },
      topUsers: topUsers.map(u => ({
        id: u.userId,
        generated: u.totalGenerated,
        videosGenerated: u.videosGenerated || 0,
        spent: u.creditsUsed || 0,  // Show image credits used
        videoCreditsUsed: u.videoCreditsUsed || 0, // Show video credits used
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

// Track video generation (success)
export const trackVideoGeneration = async (userId, model, mode, prompt, duration, aspectRatio, creditsUsed) => {
  try {
    console.log(`Tracking video generation: userId=${userId}, model=${model}, mode=${mode}, credits=${creditsUsed}`);

    // Create video generation record
    await prisma.videoGeneration.create({
      data: {
        userId,
        model,
        mode,
        prompt,
        duration,
        aspectRatio,
        creditsUsed,
        success: true
      }
    });

    // Update user's video stats
    await prisma.user.update({
      where: { userId },
      data: {
        videosGenerated: {
          increment: 1
        },
        videoCreditsUsed: {
          increment: creditsUsed
        },
        lastActive: new Date()
      }
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Map model to database field
    // Note: sora-2-pro and sora-2-pro-1080p should be counted as Sora 2
    const modelField = model === 'sora-2-hd' ? 'videosSora2HD'
                     : (model === 'sora-2' || model === 'sora-2-pro' || model === 'sora-2-pro-1080p') ? 'videosSora2'
                     : 'videosVeo3';

    await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        totalVideos: {
          increment: 1
        },
        [modelField]: {
          increment: 1
        }
      },
      create: {
        date: today,
        totalVideos: 1,
        [modelField]: 1
      }
    });

    // Update monthly stats
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    await prisma.monthlyStats.upsert({
      where: { month },
      update: {
        totalVideos: {
          increment: 1
        },
        [modelField]: {
          increment: 1
        }
      },
      create: {
        month,
        totalVideos: 1,
        [modelField]: 1
      }
    });

    return true;
  } catch (error) {
    console.error('Error tracking video generation:', error);
    return false;
  }
};

// Track video generation error/failure
export const trackVideoError = async (userId, model, mode, errorType, errorMessage, creditsRefunded) => {
  try {
    console.log(`Tracking video error: userId=${userId}, model=${model}, errorType=${errorType}, refunded=${creditsRefunded}`);

    // Create video error record
    await prisma.videoError.create({
      data: {
        userId,
        model,
        mode,
        errorType,
        errorMessage,
        creditsRefunded
      }
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        videoErrors: {
          increment: 1
        }
      },
      create: {
        date: today,
        videoErrors: 1
      }
    });

    // Update monthly stats
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    await prisma.monthlyStats.upsert({
      where: { month },
      update: {
        videoErrors: {
          increment: 1
        }
      },
      create: {
        month,
        videoErrors: 1
      }
    });

    return true;
  } catch (error) {
    console.error('Error tracking video error:', error);
    return false;
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

    // Delete old video generation records
    await prisma.videoGeneration.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    // Delete old video error records
    await prisma.videoError.deleteMany({
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