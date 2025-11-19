// API endpoint for affiliate withdrawal
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MIN_WITHDRAWAL_AMOUNT = 100; // ขั้นต่ำ 100 บาท

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET - ดูประวัติการถอนเงิน
    if (method === 'GET') {
      const { userId, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
        });
      }

      const withdrawals = await prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      });

      const totalCount = await prisma.withdrawal.count({
        where: { userId }
      });

      return res.status(200).json({
        success: true,
        withdrawals: withdrawals.map(w => ({
          withdrawalId: w.withdrawalId,
          amount: w.amount,
          bankName: w.bankName,
          bankAccount: w.bankAccount,
          accountName: w.accountName,
          status: w.status,
          slipUrl: w.slipUrl,
          note: w.note,
          requestedAt: w.requestedAt,
          processedAt: w.processedAt,
          completedAt: w.completedAt
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit)
        }
      });
    }

    // POST - สร้างคำขอถอนเงินใหม่
    if (method === 'POST') {
      const { userId, amount, bankName, bankAccount, accountName } = req.body;

      // Validation
      if (!userId || !amount || !bankName || !bankAccount || !accountName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, amount, bankName, bankAccount, accountName'
        });
      }

      // เช็คยอดขั้นต่ำ
      if (amount < MIN_WITHDRAWAL_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} baht`
        });
      }

      // ดึงข้อมูล user
      const user = await prisma.user.findUnique({
        where: { userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // เช็คว่ามีเงินพอถอนหรือไม่
      if (user.pendingCommission < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          availableBalance: user.pendingCommission
        });
      }

      // เช็คว่ามีคำขอถอนที่รออนุมัติอยู่หรือไม่
      const pendingWithdrawal = await prisma.withdrawal.findFirst({
        where: {
          userId,
          status: 'pending'
        }
      });

      if (pendingWithdrawal) {
        return res.status(400).json({
          success: false,
          message: 'You have a pending withdrawal request. Please wait for it to be processed.',
          pendingWithdrawalId: pendingWithdrawal.withdrawalId
        });
      }

      // สร้างคำขอถอนเงิน
      const withdrawalId = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const withdrawal = await prisma.withdrawal.create({
        data: {
          withdrawalId,
          userId,
          amount,
          bankName,
          bankAccount,
          accountName,
          status: 'pending'
        }
      });

      // อัพเดทยอดเงิน user (หักจาก pendingCommission)
      await prisma.user.update({
        where: { userId },
        data: {
          pendingCommission: {
            decrement: amount
          }
        }
      });

      console.log(`[Affiliate] Withdrawal request created: ${withdrawalId} for ${userId} - Amount: ${amount} baht`);

      return res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        withdrawal: {
          withdrawalId: withdrawal.withdrawalId,
          amount: withdrawal.amount,
          bankName: withdrawal.bankName,
          bankAccount: withdrawal.bankAccount,
          accountName: withdrawal.accountName,
          status: withdrawal.status,
          requestedAt: withdrawal.requestedAt
        }
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`
    });

  } catch (error) {
    console.error('Affiliate withdrawal API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
