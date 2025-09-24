// API endpoint for analytics operations
// Use server-side analytics for production
import {
  trackUser,
  trackPayment,
  trackImageGeneration,
  getAnalyticsSummary,
  getDetailedStats,
  exportAnalyticsData
} from '../../lib/analytics-server';

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (method) {
      case 'POST':
        const { action, data } = req.body;

        switch (action) {
          case 'trackUser':
            const totalUsers = trackUser(data.userId);
            return res.status(200).json({
              success: true,
              totalUsers,
              message: 'User tracked successfully'
            });

          case 'trackPayment':
            const transaction = trackPayment(
              data.userId,
              data.amount,
              data.package,
              data.transactionId
            );
            return res.status(200).json({
              success: true,
              transaction,
              message: 'Payment tracked successfully'
            });

          case 'trackImage':
            const tracked = trackImageGeneration(data.userId, data.style);
            return res.status(200).json({
              success: true,
              tracked,
              message: 'Image generation tracked'
            });

          default:
            return res.status(400).json({
              success: false,
              message: 'Invalid action'
            });
        }

      case 'GET':
        const { type, startDate, endDate, adminKey } = req.query;

        // Simple admin authentication
        const ADMIN_KEY = process.env.ADMIN_KEY || 'nano-admin-2024';
        if (adminKey !== ADMIN_KEY) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized'
          });
        }

        switch (type) {
          case 'summary':
            const summary = getAnalyticsSummary();
            return res.status(200).json({
              success: true,
              data: summary
            });

          case 'detailed':
            if (!startDate || !endDate) {
              return res.status(400).json({
                success: false,
                message: 'Start and end dates required'
              });
            }
            const detailed = getDetailedStats(startDate, endDate);
            return res.status(200).json({
              success: true,
              data: detailed
            });

          case 'export':
            const exportData = exportAnalyticsData();
            return res.status(200).json({
              success: true,
              data: exportData
            });

          default:
            return res.status(400).json({
              success: false,
              message: 'Invalid type'
            });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}