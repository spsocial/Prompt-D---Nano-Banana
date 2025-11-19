// API endpoint for setting referral code for new user
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (method === 'POST') {
      const { userId, referralCode } = req.body;

      if (!userId || !referralCode) {
        return res.status(400).json({
          success: false,
          message: 'userId and referralCode required'
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

      // เช็คว่า user มี referredBy อยู่แล้วหรือยัง
      if (user.referredBy) {
        return res.status(400).json({
          success: false,
          message: 'User already has a referral code set',
          referredBy: user.referredBy
        });
      }

      // Validate referral code - ต้องมีจริงในระบบ
      const affiliate = await prisma.user.findUnique({
        where: { referralCode: referralCode }
      });

      if (!affiliate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }

      // ป้องกันไม่ให้แนะนำตัวเอง
      if (affiliate.userId === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot refer yourself'
        });
      }

      // บันทึก referredBy ลง user
      await prisma.user.update({
        where: { userId },
        data: {
          referredBy: referralCode
        }
      });

      // อัพเดทจำนวนคนที่แนะนำของ affiliate
      await prisma.user.update({
        where: { userId: affiliate.userId },
        data: {
          referralCount: { increment: 1 }
        }
      });

      console.log(`[Affiliate] User ${userId} was referred by ${referralCode} (${affiliate.userId})`);

      return res.status(200).json({
        success: true,
        message: 'Referral code set successfully',
        referredBy: referralCode,
        affiliateName: affiliate.name || 'User'
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`
    });

  } catch (error) {
    console.error('Set referral API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
