// API endpoint for credit management
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      case 'GET':
        // Get user credits
        const { userId } = req.query;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'User ID required'
          });
        }

        // Get or create user using upsert to avoid duplicate errors
        const user = await prisma.user.upsert({
          where: { userId },
          update: {
            lastActive: new Date()
          },
          create: {
            userId,
            firstSeen: new Date(),
            lastActive: new Date(),
            totalGenerated: 0,
            totalSpent: 0,
            credits: 0,
            creditsUsed: 0
          }
        });

        return res.status(200).json({
          success: true,
          userId: user.userId,
          credits: user.credits,
          totalGenerated: user.totalGenerated
        });

      case 'POST':
        // Add credits to user (for both manual admin adds and automatic refunds)
        const { targetUserId, userId: bodyUserId, amount, type, adminKey, isRefund } = req.body;

        // Use targetUserId or userId (for backward compatibility)
        const finalUserId = targetUserId || bodyUserId;

        // Skip admin key check for refunds (automatic system refunds)
        if (!isRefund) {
          // Simple admin authentication for manual credit additions
          const ADMIN_KEY = process.env.ADMIN_KEY || 'nano-admin-2024';
          if (adminKey !== ADMIN_KEY) {
            return res.status(401).json({
              success: false,
              message: 'Unauthorized'
            });
          }
        }

        if (!finalUserId || !amount) {
          return res.status(400).json({
            success: false,
            message: 'User ID and amount required'
          });
        }

        // Update or create user
        const updatedUser = await prisma.user.upsert({
          where: { userId: finalUserId },
          update: {
            credits: {
              increment: amount
            },
            lastActive: new Date()
          },
          create: {
            userId: finalUserId,
            firstSeen: new Date(),
            lastActive: new Date(),
            totalGenerated: 0,
            totalSpent: 0,
            credits: amount
          }
        });

        // Track transactions (skip for refunds to avoid clutter)
        if (!isRefund) {
          await prisma.transaction.create({
            data: {
              transactionId: `MANUAL-${Date.now()}`,
              userId: finalUserId,
              amount: amount,
              packageName: type === 'free' ? `เครดิตฟรี - ${amount} เครดิต` : `เติมเงินแมนนวล - ${amount} เครดิต`,
              status: 'completed'
            }
          });
        }

        const actionType = isRefund ? 'Refunded' : 'Added';
        console.log(`[API] ${actionType} ${amount} credits to ${finalUserId}, new total: ${updatedUser.credits}`);

        return res.status(200).json({
          success: true,
          message: `${actionType} ${amount} credits to ${finalUserId}`,
          userId: finalUserId,
          credits: updatedUser.credits,
          type: type,
          isRefund: isRefund
        });

      case 'PUT':
        // Use credits
        const { userId: useUserId, useAmount = 1 } = req.body;

        if (!useUserId) {
          return res.status(400).json({
            success: false,
            message: 'User ID required'
          });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { userId: useUserId }
        });

        if (!existingUser) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        if (existingUser.credits < useAmount) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient credits',
            credits: existingUser.credits
          });
        }

        // Update user's credits
        const userAfterUse = await prisma.user.update({
          where: { userId: useUserId },
          data: {
            credits: {
              decrement: useAmount
            },
            totalGenerated: {
              increment: useAmount
            },
            lastActive: new Date()
          }
        });

        return res.status(200).json({
          success: true,
          userId: useUserId,
          credits: userAfterUse.credits,
          message: `Used ${useAmount} credits`
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('Credits API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}