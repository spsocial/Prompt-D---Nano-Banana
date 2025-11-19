import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all pending withdrawal requests with user information
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        status: 'pending'
      },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    // Format the response to include user info at top level
    const formattedWithdrawals = withdrawals.map(w => ({
      withdrawalId: w.withdrawalId,
      userId: w.userId,
      userName: w.user?.name || 'Unknown User',
      userEmail: w.user?.email || '-',
      amount: w.amount,
      bankName: w.bankName,
      bankAccount: w.bankAccount,
      accountName: w.accountName,
      status: w.status,
      createdAt: w.createdAt,
      processedAt: w.processedAt
    }));

    console.log(`📊 Admin fetched ${formattedWithdrawals.length} pending withdrawals`);

    return res.status(200).json({
      success: true,
      withdrawals: formattedWithdrawals
    });

  } catch (error) {
    console.error('❌ Error fetching pending withdrawals:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
