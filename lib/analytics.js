// Analytics tracking system for Prompt D
// Stores data in localStorage with backup to IndexedDB

const ANALYTICS_KEY = 'nano_analytics';
const PAYMENTS_KEY = 'nano_payments';
const USERS_KEY = 'nano_users_list';

// Initialize analytics data structure
const initAnalytics = () => {
  const defaultAnalytics = {
    totalUsers: 0,
    activeUsers: [],
    dailyStats: {},
    monthlyStats: {},
    yearlyStats: {},
    lastUpdated: new Date().toISOString()
  };

  const existing = localStorage.getItem(ANALYTICS_KEY);
  if (!existing) {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(defaultAnalytics));
    return defaultAnalytics;
  }

  return JSON.parse(existing);
};

// Initialize payments data structure
const initPayments = () => {
  const defaultPayments = {
    totalRevenue: 0,
    transactions: [],
    dailyRevenue: {},
    monthlyRevenue: {},
    yearlyRevenue: {},
    lastUpdated: new Date().toISOString()
  };

  const existing = localStorage.getItem(PAYMENTS_KEY);
  if (!existing) {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(defaultPayments));
    return defaultPayments;
  }

  return JSON.parse(existing);
};

// Track unique user
export const trackUser = (userId) => {
  try {
    // Get existing users list
    const usersData = localStorage.getItem(USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];

    // Check if user already exists
    const existingUser = users.find(u => u.id === userId);

    if (!existingUser) {
      // New user
      users.push({
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

    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Update analytics
    const analytics = initAnalytics();
    analytics.totalUsers = users.length;
    analytics.activeUsers = users.filter(u => {
      const lastActive = new Date(u.lastActive);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastActive > dayAgo;
    }).map(u => u.id);

    // Update daily stats
    const today = new Date().toLocaleDateString('th-TH');
    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = {
        newUsers: 0,
        activeUsers: [],
        imagesGenerated: 0
      };
    }

    if (!existingUser) {
      analytics.dailyStats[today].newUsers++;
    }

    if (!analytics.dailyStats[today].activeUsers.includes(userId)) {
      analytics.dailyStats[today].activeUsers.push(userId);
    }

    analytics.lastUpdated = new Date().toISOString();
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));

    return users.length;
  } catch (error) {
    console.error('Error tracking user:', error);
    return 0;
  }
};

// Track payment/top-up
export const trackPayment = (userId, amount, package, transactionId) => {
  try {
    const payments = initPayments();
    const now = new Date();
    const today = now.toLocaleDateString('th-TH');
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear().toString();

    // Add transaction
    const transaction = {
      id: transactionId || `TXN-${Date.now()}`,
      userId,
      amount,
      package,
      timestamp: now.toISOString(),
      date: today,
      month,
      year
    };

    payments.transactions.push(transaction);
    payments.totalRevenue += amount;

    // Update daily revenue
    if (!payments.dailyRevenue[today]) {
      payments.dailyRevenue[today] = {
        amount: 0,
        transactions: 0,
        users: []
      };
    }
    payments.dailyRevenue[today].amount += amount;
    payments.dailyRevenue[today].transactions++;
    if (!payments.dailyRevenue[today].users.includes(userId)) {
      payments.dailyRevenue[today].users.push(userId);
    }

    // Update monthly revenue
    if (!payments.monthlyRevenue[month]) {
      payments.monthlyRevenue[month] = {
        amount: 0,
        transactions: 0,
        users: [],
        dailyBreakdown: {}
      };
    }
    payments.monthlyRevenue[month].amount += amount;
    payments.monthlyRevenue[month].transactions++;
    if (!payments.monthlyRevenue[month].users.includes(userId)) {
      payments.monthlyRevenue[month].users.push(userId);
    }

    // Update yearly revenue
    if (!payments.yearlyRevenue[year]) {
      payments.yearlyRevenue[year] = {
        amount: 0,
        transactions: 0,
        users: [],
        monthlyBreakdown: {}
      };
    }
    payments.yearlyRevenue[year].amount += amount;
    payments.yearlyRevenue[year].transactions++;
    if (!payments.yearlyRevenue[year].users.includes(userId)) {
      payments.yearlyRevenue[year].users.push(userId);
    }

    // Update user's total spent
    const usersData = localStorage.getItem(USERS_KEY);
    if (usersData) {
      const users = JSON.parse(usersData);
      const user = users.find(u => u.id === userId);
      if (user) {
        user.totalSpent = (user.totalSpent || 0) + amount;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }

    payments.lastUpdated = now.toISOString();
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));

    return transaction;
  } catch (error) {
    console.error('Error tracking payment:', error);
    return null;
  }
};

// Track image generation
export const trackImageGeneration = (userId, style) => {
  try {
    const analytics = initAnalytics();
    const today = new Date().toLocaleDateString('th-TH');

    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = {
        newUsers: 0,
        activeUsers: [],
        imagesGenerated: 0,
        styleBreakdown: {}
      };
    }

    analytics.dailyStats[today].imagesGenerated++;

    // Track style usage
    if (!analytics.dailyStats[today].styleBreakdown[style]) {
      analytics.dailyStats[today].styleBreakdown[style] = 0;
    }
    analytics.dailyStats[today].styleBreakdown[style]++;

    // Update user's total generated
    const usersData = localStorage.getItem(USERS_KEY);
    if (usersData) {
      const users = JSON.parse(usersData);
      const user = users.find(u => u.id === userId);
      if (user) {
        user.totalGenerated = (user.totalGenerated || 0) + 1;
        user.lastActive = new Date().toISOString();
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }

    analytics.lastUpdated = new Date().toISOString();
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));

    return true;
  } catch (error) {
    console.error('Error tracking image generation:', error);
    return false;
  }
};

// Get analytics summary
export const getAnalyticsSummary = () => {
  try {
    const analytics = initAnalytics();
    const payments = initPayments();
    const users = localStorage.getItem(USERS_KEY);
    const usersList = users ? JSON.parse(users) : [];

    const now = new Date();
    const today = now.toLocaleDateString('th-TH');
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear().toString();

    // Calculate active users (last 24 hours, 7 days, 30 days)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeToday = usersList.filter(u => new Date(u.lastActive) > dayAgo).length;
    const activeWeek = usersList.filter(u => new Date(u.lastActive) > weekAgo).length;
    const activeMonth = usersList.filter(u => new Date(u.lastActive) > monthAgo).length;

    return {
      users: {
        total: usersList.length,
        activeToday,
        activeWeek,
        activeMonth,
        newToday: analytics.dailyStats[today]?.newUsers || 0
      },
      revenue: {
        total: payments.totalRevenue,
        today: payments.dailyRevenue[today]?.amount || 0,
        month: payments.monthlyRevenue[month]?.amount || 0,
        year: payments.yearlyRevenue[year]?.amount || 0,
        transactionsToday: payments.dailyRevenue[today]?.transactions || 0,
        transactionsMonth: payments.monthlyRevenue[month]?.transactions || 0
      },
      images: {
        today: analytics.dailyStats[today]?.imagesGenerated || 0,
        styleBreakdown: analytics.dailyStats[today]?.styleBreakdown || {}
      },
      topUsers: usersList
        .sort((a, b) => (b.totalGenerated || 0) - (a.totalGenerated || 0))
        .slice(0, 10)
        .map(u => ({
          id: u.id,
          generated: u.totalGenerated || 0,
          spent: u.totalSpent || 0,
          lastActive: u.lastActive
        })),
      recentTransactions: payments.transactions
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
    const analytics = initAnalytics();
    const payments = initPayments();

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredTransactions = payments.transactions.filter(t => {
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
      dailyBreakdown: Object.keys(analytics.dailyStats)
        .filter(date => {
          const d = new Date(date);
          return d >= start && d <= end;
        })
        .map(date => ({
          date,
          stats: analytics.dailyStats[date],
          revenue: payments.dailyRevenue[date] || { amount: 0, transactions: 0 }
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
    const analytics = initAnalytics();
    const payments = initPayments();
    const users = localStorage.getItem(USERS_KEY);

    return {
      exportDate: new Date().toISOString(),
      analytics,
      payments,
      users: users ? JSON.parse(users) : []
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
};

// Clear old data (keep last 90 days)
export const cleanOldData = () => {
  try {
    const analytics = initAnalytics();
    const payments = initPayments();
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Clean daily stats
    Object.keys(analytics.dailyStats).forEach(date => {
      if (new Date(date) < cutoffDate) {
        delete analytics.dailyStats[date];
      }
    });

    // Clean daily revenue
    Object.keys(payments.dailyRevenue).forEach(date => {
      if (new Date(date) < cutoffDate) {
        delete payments.dailyRevenue[date];
      }
    });

    // Keep only last 1000 transactions
    if (payments.transactions.length > 1000) {
      payments.transactions = payments.transactions.slice(-1000);
    }

    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));

    return true;
  } catch (error) {
    console.error('Error cleaning old data:', error);
    return false;
  }
};