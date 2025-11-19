// API endpoint for generating affiliate referral code
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ฟังก์ชั่นสร้างรหัสแนะนำแบบสุ่ม
function generateReferralCode(name) {
  // สร้างรหัสจาก name (ถ้ามี) + random string
  const prefix = 'PDSTUDIO';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  if (name) {
    // ใช้ชื่อหน้าตัวหนังสือแรก + random
    const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    return `${prefix}-${namePrefix}${random}`;
  }

  return `${prefix}-${random}`;
}

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
      const { userId, customCode } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
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

      // ถ้ามี referralCode อยู่แล้ว ให้ return กลับไป
      if (user.referralCode) {
        return res.status(200).json({
          success: true,
          referralCode: user.referralCode,
          message: 'Referral code already exists'
        });
      }

      // สร้างรหัสแนะนำใหม่
      let referralCode;
      let attempts = 0;
      const maxAttempts = 10;

      // ถ้า user ระบุ customCode มา ให้ลองใช้ก่อน
      if (customCode) {
        const customCodeFormatted = `PDSTUDIO-${customCode.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

        // เช็คว่า customCode ซ้ำหรือไม่
        const existingCode = await prisma.user.findUnique({
          where: { referralCode: customCodeFormatted }
        });

        if (existingCode) {
          return res.status(400).json({
            success: false,
            message: 'Custom code already taken. Please try another one.'
          });
        }

        referralCode = customCodeFormatted;
      } else {
        // สร้างรหัสแบบ auto-generate
        while (attempts < maxAttempts) {
          referralCode = generateReferralCode(user.name);

          // เช็คว่ารหัสซ้ำหรือไม่
          const existing = await prisma.user.findUnique({
            where: { referralCode }
          });

          if (!existing) {
            break; // รหัสไม่ซ้ำ ใช้ได้
          }

          attempts++;
        }

        if (attempts >= maxAttempts) {
          return res.status(500).json({
            success: false,
            message: 'Failed to generate unique referral code. Please try again.'
          });
        }
      }

      // บันทึกรหัสแนะนำลง database
      const updatedUser = await prisma.user.update({
        where: { userId },
        data: {
          referralCode,
          lastActive: new Date()
        }
      });

      console.log(`[Affiliate] Generated referral code for ${userId}: ${referralCode}`);

      return res.status(200).json({
        success: true,
        referralCode: updatedUser.referralCode,
        message: 'Referral code generated successfully'
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`
    });

  } catch (error) {
    console.error('Generate referral code API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
