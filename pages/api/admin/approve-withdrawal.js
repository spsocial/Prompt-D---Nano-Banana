import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin authentication
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Add admin role check
    // if (!session.user.isAdmin) {
    //   return res.status(403).json({ error: 'Forbidden - Admin only' });
    // }

    const { withdrawalId, action, slipUrl, note } = req.body;

    if (!withdrawalId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get withdrawal request
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { withdrawalId },
      include: { user: true }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal request already processed' });
    }

    const now = new Date();

    if (action === 'approve') {
      // อนุมัติการถอน
      await prisma.$transaction(async (tx) => {
        // 1. Update withdrawal status
        await tx.withdrawal.update({
          where: { withdrawalId },
          data: {
            status: 'completed',
            processedAt: now,
            completedAt: now,
            slipUrl: slipUrl || null,
            note: note || 'อนุมัติและโอนเงินเรียบร้อย'
          }
        });

        // 2. Update user's commission balances
        await tx.user.update({
          where: { userId: withdrawal.userId },
          data: {
            pendingCommission: {
              decrement: withdrawal.amount
            },
            withdrawnCommission: {
              increment: withdrawal.amount
            }
          }
        });
      });

      console.log(`✅ Withdrawal ${withdrawalId} approved: ${withdrawal.amount}฿ to ${withdrawal.userId}`);

      return res.status(200).json({
        success: true,
        message: 'อนุมัติการถอนเงินเรียบร้อย',
        withdrawal: {
          withdrawalId,
          amount: withdrawal.amount,
          status: 'completed'
        }
      });
    } else {
      // ปฏิเสธการถอน
      await prisma.$transaction(async (tx) => {
        // 1. Update withdrawal status
        await tx.withdrawal.update({
          where: { withdrawalId },
          data: {
            status: 'rejected',
            processedAt: now,
            note: note || 'ปฏิเสธการถอน'
          }
        });

        // 2. คืนเงินกลับไปที่ available balance (ไม่ต้องทำอะไรเพราะยังอยู่ใน pendingCommission)
      });

      console.log(`❌ Withdrawal ${withdrawalId} rejected`);

      return res.status(200).json({
        success: true,
        message: 'ปฏิเสธการถอนเงิน',
        withdrawal: {
          withdrawalId,
          amount: withdrawal.amount,
          status: 'rejected'
        }
      });
    }
  } catch (error) {
    console.error('❌ Approve withdrawal error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
