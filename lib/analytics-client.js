// Client-side analytics functions that call the API
// These functions can be safely imported in client components

export const trackUser = async (userId) => {
  try {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'trackUser',
        data: { userId }
      })
    });
    const result = await response.json();
    return result.totalUsers || 0;
  } catch (error) {
    console.error('Error tracking user:', error);
    return 0;
  }
};

export const trackPayment = async (userId, amount, packageName, transactionId) => {
  try {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'trackPayment',
        data: {
          userId,
          amount,
          package: packageName,
          transactionId
        }
      })
    });
    const result = await response.json();
    return result.transaction;
  } catch (error) {
    console.error('Error tracking payment:', error);
    return null;
  }
};

export const trackImageGeneration = async (userId, style) => {
  try {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'trackImage',
        data: { userId, style }
      })
    });
    const result = await response.json();
    return result.tracked || false;
  } catch (error) {
    console.error('Error tracking image generation:', error);
    return false;
  }
};

export const getAnalyticsSummary = async () => {
  try {
    // For admin dashboard - requires authentication
    const adminKey = 'nano@admin2024'; // Match the real admin key
    const response = await fetch(`/api/analytics?type=summary&adminKey=${adminKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
};

export const getDetailedStats = async (startDate, endDate) => {
  try {
    const adminKey = 'nano@admin2024';
    const response = await fetch(
      `/api/analytics?type=detailed&startDate=${startDate}&endDate=${endDate}&adminKey=${adminKey}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch detailed stats');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting detailed stats:', error);
    return null;
  }
};

export const exportAnalyticsData = async () => {
  try {
    const adminKey = 'nano@admin2024';
    const response = await fetch(`/api/analytics?type=export&adminKey=${adminKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
};