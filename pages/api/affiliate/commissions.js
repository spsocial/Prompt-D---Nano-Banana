// API endpoint for affiliate commissions
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (method === 'GET') {
      const { userId, status, limit = 50, offset = 0 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
        });
      }

      // เช็คว่า user มีอยู่จริง
      const user = await prisma.user.findUnique({
        where: { userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // สร้าง where clause ตาม filter
      const whereClause = {
        affiliateId: userId
      };

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      // ดึงรายการค่าคอมทั้งหมด
      const commissions = await prisma.commission.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(offset),
        take: parseInt(limit)
      });

      // นับจำนวนทั้งหมด
      const totalCount = await prisma.commission.count({
        where: whereClause
      });

      // คำนวณสถิติ
      const allCommissions = await prisma.commission.findMany({
        where: { affiliateId: userId }
      });

      const stats = {
        total: allCommissions.length,
        pending: allCommissions.filter(c => c.status === 'pending').length,
        approved: allCommissions.filter(c => c.status === 'approved').length,
        paid: allCommissions.filter(c => c.status === 'paid').length,

        totalAmount: allCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        pendingAmount: allCommissions
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        approvedAmount: allCommissions
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        paidAmount: allCommissions
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
      };

      return res.status(200).json({
        success: true,
        commissions: commissions.map(c => ({
          commissionId: c.commissionId,
          referredUserId: c.referredUserId,
          referredUserName: c.referredUserName,
          transactionId: c.transactionId,
          packageName: c.packageName,
          packageAmount: c.packageAmount,
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          status: c.status,
          createdAt: c.createdAt,
          approvedAt: c.approvedAt,
          paidAt: c.paidAt
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit)
        },
        stats
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`
    });

  } catch (error) {
    console.error('Affiliate commissions API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
