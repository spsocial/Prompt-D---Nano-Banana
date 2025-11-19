// API endpoint for validating referral code
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
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: 'Referral code required'
        });
      }

      // หา user ที่มี referralCode นี้
      const affiliate = await prisma.user.findUnique({
        where: { referralCode: code },
        select: {
          userId: true,
          name: true,
          email: true,
          referralCode: true
        }
      });

      if (!affiliate) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'รหัสแนะนำไม่ถูกต้อง'
        });
      }

      return res.status(200).json({
        success: true,
        valid: true,
        message: 'รหัสแนะนำถูกต้อง',
        affiliate: {
          name: affiliate.name || 'User',
          referralCode: affiliate.referralCode
        }
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`
    });

  } catch (error) {
    console.error('Validate referral code API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
