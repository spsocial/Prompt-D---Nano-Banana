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

        // Get or create user
        let user = await prisma.user.findUnique({
          where: { userId }
        });

        if (!user) {
          // Create new user with 0 credits
          user = await prisma.user.create({
            data: {
              userId,
              firstSeen: new Date(),
              lastActive: new Date(),
              totalGenerated: 0,
              totalSpent: 0,
              credits: 0
            }
          });
        } else {
          // Update last active
          await prisma.user.update({
            where: { userId },
            data: { lastActive: new Date() }
          });
        }

        return res.status(200).json({
          success: true,
          userId: user.userId,
          credits: user.credits,
          totalGenerated: user.totalGenerated
        });

      case 'POST':
        // Add credits to user
        const { targetUserId, amount, type, adminKey } = req.body;

        // Simple admin authentication
        const ADMIN_KEY = process.env.ADMIN_KEY || 'nano-admin-2024';
        if (adminKey !== ADMIN_KEY) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized'
          });
        }

        if (!targetUserId || !amount) {
          return res.status(400).json({
            success: false,
            message: 'Target user ID and amount required'
          });
        }

        // Update or create user
        const updatedUser = await prisma.user.upsert({
          where: { userId: targetUserId },
          update: {
            credits: {
              increment: amount
            },
            lastActive: new Date()
          },
          create: {
            userId: targetUserId,
            firstSeen: new Date(),
            lastActive: new Date(),
            totalGenerated: 0,
            totalSpent: 0,
            credits: amount
          }
        });

        // Track all manual credit additions as transactions
        await prisma.transaction.create({
          data: {
            transactionId: `MANUAL-${Date.now()}`,
            userId: targetUserId,
            amount: amount, // Store the credit amount for statistics
            packageName: type === 'free' ? `เครดิตฟรี - ${amount} เครดิต` : `เติมเงินแมนนวล - ${amount} เครดิต`,
            status: 'completed'
          }
        });

        console.log(`[API] Added ${amount} credits to ${targetUserId}, new total: ${updatedUser.credits}`);

        return res.status(200).json({
          success: true,
          message: `Added ${amount} credits to ${targetUserId}`,
          userId: targetUserId,
          credits: updatedUser.credits,
          type: type
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