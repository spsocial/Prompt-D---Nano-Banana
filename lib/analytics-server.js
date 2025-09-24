// Server-side analytics storage (in-memory for now)
// For production, should use a real database

// In-memory storage (resets when server restarts)
let analyticsData = {
  totalUsers: 0,
  activeUsers: [],
  dailyStats: {},
  monthlyStats: {},
  yearlyStats: {},
  lastUpdated: new Date().toISOString()
};

let paymentsData = {
  totalRevenue: 0,
  transactions: [],
  dailyRevenue: {},
  monthlyRevenue: {},
  yearlyRevenue: {},
  lastUpdated: new Date().toISOString()
};

let usersData = [];

// Track unique user
export const trackUser = (userId) => {
  try {
    // Check if user already exists
    const existingUser = usersData.find(u => u.id === userId);

    if (!existingUser) {
      // New user
      usersData.push({
        id: userId,
        firstSeen: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalGenerated: 0,
        totalSpent: 0
      });
    } else {
      // Update existing user
      existingUser.lastActive = new Date().toISOString();
    }

    // Update analytics
    analyticsData.totalUsers = usersData.length;
    analyticsData.activeUsers = usersData.filter(u => {
      const lastActive = new Date(u.lastActive);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastActive > dayAgo;
    }).map(u => u.id);

    // Update daily stats
    const today = new Date().toLocaleDateString('th-TH');
    if (!analyticsData.dailyStats[today]) {
      analyticsData.dailyStats[today] = {
        newUsers: 0,
        activeUsers: [],
        imagesGenerated: 0
      };
    }

    if (!existingUser) {
      analyticsData.dailyStats[today].newUsers++;
    }

    if (!analyticsData.dailyStats[today].activeUsers.includes(userId)) {
      analyticsData.dailyStats[today].activeUsers.push(userId);
    }

    analyticsData.lastUpdated = new Date().toISOString();

    return usersData.length;
  } catch (error) {
    console.error('Error tracking user:', error);
    return 0;
  }
};

// Track payment/top-up
export const trackPayment = (userId, amount, packageName, transactionId) => {
  try {
    const now = new Date();
    const today = now.toLocaleDateString('th-TH');
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear().toString();

    // Add transaction
    const transaction = {
      id: transactionId || `TXN-${Date.now()}`,
      userId,
      amount,
      package: packageName,
      timestamp: now.toISOString(),
      date: today,
      month,
      year
    };

    paymentsData.transactions.push(transaction);
    paymentsData.totalRevenue += amount;

    // Update daily revenue
    if (!paymentsData.dailyRevenue[today]) {
      paymentsData.dailyRevenue[today] = {
        amount: 0,
        transactions: 0,
        users: []
      };
    }
    paymentsData.dailyRevenue[today].amount += amount;
    paymentsData.dailyRevenue[today].transactions++;
    if (!paymentsData.dailyRevenue[today].users.includes(userId)) {
      paymentsData.dailyRevenue[today].users.push(userId);
    }

    // Update monthly revenue
    if (!paymentsData.monthlyRevenue[month]) {
      paymentsData.monthlyRevenue[month] = {
        amount: 0,
        transactions: 0,
        users: [],
        dailyBreakdown: {}
      };
    }
    paymentsData.monthlyRevenue[month].amount += amount;
    paymentsData.monthlyRevenue[month].transactions++;
    if (!paymentsData.monthlyRevenue[month].users.includes(userId)) {
      paymentsData.monthlyRevenue[month].users.push(userId);
    }

    // Update yearly revenue
    if (!paymentsData.yearlyRevenue[year]) {
      paymentsData.yearlyRevenue[year] = {
        amount: 0,
        transactions: 0,
        users: [],
        monthlyBreakdown: {}
      };
    }
    paymentsData.yearlyRevenue[year].amount += amount;
    paymentsData.yearlyRevenue[year].transactions++;
    if (!paymentsData.yearlyRevenue[year].users.includes(userId)) {
      paymentsData.yearlyRevenue[year].users.push(userId);
    }

    // Update user's total spent
    const user = usersData.find(u => u.id === userId);
    if (user) {
      user.totalSpent = (user.totalSpent || 0) + amount;
    }

    paymentsData.lastUpdated = now.toISOString();

    return transaction;
  } catch (error) {
    console.error('Error tracking payment:', error);
    return null;
  }
};

// Track image generation
export const trackImageGeneration = (userId, style) => {
  try {
    const today = new Date().toLocaleDateString('th-TH');

    if (!analyticsData.dailyStats[today]) {
      analyticsData.dailyStats[today] = {
        newUsers: 0,
        activeUsers: [],
        imagesGenerated: 0,
        styleBreakdown: {}
      };
    }

    analyticsData.dailyStats[today].imagesGenerated++;

    // Track style usage
    if (!analyticsData.dailyStats[today].styleBreakdown[style]) {
      analyticsData.dailyStats[today].styleBreakdown[style] = 0;
    }
    analyticsData.dailyStats[today].styleBreakdown[style]++;

    // Update user's total generated
    const user = usersData.find(u => u.id === userId);
    if (user) {
      user.totalGenerated = (user.totalGenerated || 0) + 1;
      user.lastActive = new Date().toISOString();
    }

    analyticsData.lastUpdated = new Date().toISOString();

    return true;
  } catch (error) {
    console.error('Error tracking image generation:', error);
    return false;
  }
};

// Get analytics summary
export const getAnalyticsSummary = () => {
  try {
    const now = new Date();
    const today = now.toLocaleDateString('th-TH');
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear().toString();

    // Calculate active users (last 24 hours, 7 days, 30 days)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeToday = usersData.filter(u => new Date(u.lastActive) > dayAgo).length;
    const activeWeek = usersData.filter(u => new Date(u.lastActive) > weekAgo).length;
    const activeMonth = usersData.filter(u => new Date(u.lastActive) > monthAgo).length;

    return {
      users: {
        total: usersData.length,
        activeToday,
        activeWeek,
        activeMonth,
        newToday: analyticsData.dailyStats[today]?.newUsers || 0
      },
      revenue: {
        total: paymentsData.totalRevenue,
        today: paymentsData.dailyRevenue[today]?.amount || 0,
        month: paymentsData.monthlyRevenue[month]?.amount || 0,
        year: paymentsData.yearlyRevenue[year]?.amount || 0,
        transactionsToday: paymentsData.dailyRevenue[today]?.transactions || 0,
        transactionsMonth: paymentsData.monthlyRevenue[month]?.transactions || 0
      },
      images: {
        today: analyticsData.dailyStats[today]?.imagesGenerated || 0,
        styleBreakdown: analyticsData.dailyStats[today]?.styleBreakdown || {}
      },
      topUsers: usersData
        .sort((a, b) => (b.totalGenerated || 0) - (a.totalGenerated || 0))
        .slice(0, 10)
        .map(u => ({
          id: u.id,
          generated: u.totalGenerated || 0,
          spent: u.totalSpent || 0,
          lastActive: u.lastActive
        })),
      recentTransactions: paymentsData.transactions
        .slice(-10)
        .reverse()
        .map(t => ({
          id: t.id,
          userId: t.userId,
          amount: t.amount,
          package: t.package,
          timestamp: t.timestamp
        }))
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
};

// Get detailed stats for date range
export const getDetailedStats = (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredTransactions = paymentsData.transactions.filter(t => {
      const date = new Date(t.timestamp);
      return date >= start && date <= end;
    });

    const revenue = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const uniqueUsers = [...new Set(filteredTransactions.map(t => t.userId))];

    return {
      dateRange: {
        start: startDate,
        end: endDate
      },
      revenue: {
        total: revenue,
        transactions: filteredTransactions.length,
        averageTransaction: filteredTransactions.length > 0 ? revenue / filteredTransactions.length : 0,
        uniqueUsers: uniqueUsers.length
      },
      transactions: filteredTransactions,
      dailyBreakdown: Object.keys(analyticsData.dailyStats)
        .filter(date => {
          const d = new Date(date);
          return d >= start && d <= end;
        })
        .map(date => ({
          date,
          stats: analyticsData.dailyStats[date],
          revenue: paymentsData.dailyRevenue[date] || { amount: 0, transactions: 0 }
        }))
    };
  } catch (error) {
    console.error('Error getting detailed stats:', error);
    return null;
  }
};

// Export data for backup
export const exportAnalyticsData = () => {
  try {
    return {
      exportDate: new Date().toISOString(),
      analytics: analyticsData,
      payments: paymentsData,
      users: usersData
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
};

// Clean old data (keep last 90 days)
export const cleanOldData = () => {
  try {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Clean daily stats
    Object.keys(analyticsData.dailyStats).forEach(date => {
      if (new Date(date) < cutoffDate) {
        delete analyticsData.dailyStats[date];
      }
    });

    // Clean daily revenue
    Object.keys(paymentsData.dailyRevenue).forEach(date => {
      if (new Date(date) < cutoffDate) {
        delete paymentsData.dailyRevenue[date];
      }
    });

    // Keep only last 1000 transactions
    if (paymentsData.transactions.length > 1000) {
      paymentsData.transactions = paymentsData.transactions.slice(-1000);
    }

    return true;
  } catch (error) {
    console.error('Error cleaning old data:', error);
    return false;
  }
};