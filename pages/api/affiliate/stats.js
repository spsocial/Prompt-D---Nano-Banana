// API endpoint for affiliate statistics
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
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
        });
      }

      // ดึงข้อมูล user พร้อมกับรหัสแนะนำ
      const user = await prisma.user.findUnique({
        where: { userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.referralCode) {
        // ยังไม่มีรหัสแนะนำ
        return res.status(200).json({
          success: true,
          hasReferralCode: false,
          message: 'No referral code generated yet'
        });
      }

      // ดึงรายชื่อคนที่แนะนำมา
      const referredUsers = await prisma.user.findMany({
        where: {
          referredBy: user.referralCode
        },
        select: {
          userId: true,
          name: true,
          email: true,
          firstSeen: true,
          totalSpent: true,
          credits: true
        },
        orderBy: {
          firstSeen: 'desc'
        }
      });

      // นับจำนวนคนที่ซื้อ credits แล้ว (active referrals)
      const activeReferralsCount = referredUsers.filter(u => u.totalSpent > 0).length;

      // ดึงข้อมูลค่าคอมทั้งหมด
      const commissions = await prisma.commission.findMany({
        where: {
          affiliateId: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // คำนวณค่าคอมแยกตาม status
      const pendingCommissions = commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      const approvedCommissions = commissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      const paidCommissions = commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      // ดึงประวัติการถอนเงิน
      const withdrawals = await prisma.withdrawal.findMany({
        where: {
          userId
        },
        orderBy: {
          requestedAt: 'desc'
        },
        take: 10 // เอา 10 รายการล่าสุด
      });

      // สถิติรายเดือน
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const commissionsThisMonth = commissions.filter(
        c => new Date(c.createdAt) >= firstDayThisMonth
      );

      const earningsThisMonth = commissionsThisMonth.reduce(
        (sum, c) => sum + c.commissionAmount,
        0
      );

      return res.status(200).json({
        success: true,
        hasReferralCode: true,
        referralCode: user.referralCode,

        // สถิติรวม
        stats: {
          totalReferrals: referredUsers.length,
          activeReferrals: activeReferralsCount,
          totalCommission: user.totalCommission,
          pendingCommission: user.pendingCommission,
          withdrawnCommission: user.withdrawnCommission,
          availableToWithdraw: user.pendingCommission, // เงินที่พร้อมถอนได้
        },

        // สถิติรายเดือน
        monthly: {
          referralsThisMonth: referredUsers.filter(
            u => new Date(u.firstSeen) >= firstDayThisMonth
          ).length,
          earningsThisMonth: earningsThisMonth
        },

        // รายละเอียดค่าคอม
        commissionSummary: {
          pending: pendingCommissions,
          approved: approvedCommissions,
          paid: paidCommissions,
          total: commissions.reduce((sum, c) => sum + c.commissionAmount, 0)
        },

        // รายชื่อคนที่แนะนำมา (10 คนล่าสุด)
        recentReferrals: referredUsers.slice(0, 10).map(u => ({
          name: u.name || 'Anonymous',
          email: u.email,
          joinedDate: u.firstSeen,
          totalSpent: u.totalSpent,
          isActive: u.totalSpent > 0
        })),

        // ประวัติการถอนเงิน
        recentWithdrawals: withdrawals.map(w => ({
          withdrawalId: w.withdrawalId,
          amount: w.amount,
          bankName: w.bankName,
          status: w.status,
          requestedAt: w.requestedAt,
          completedAt: w.completedAt
        }))
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`
    });

  } catch (error) {
    console.error('Affiliate stats API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
