import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, credits, amount, adminPassword, reason, isInternalCall } = req.body

    // Support both 'credits' and 'amount' parameter names
    const creditAmount = amount || credits

    // Check if this is an internal API call (from server-side)
    const isInternal = isInternalCall === true || reason?.includes('Refund:')

    // Validate admin password ONLY for external calls (from admin UI)
    if (!isInternal) {
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nano2024'

      if (adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({
          success: false,
          message: 'ไม่มีสิทธิ์เข้าถึง'
        })
      }
    } else {
      console.log(`🔄 Internal credit refund request: ${userId} - ${creditAmount} credits`);
    }

    // Validate inputs
    if (!userId || !creditAmount) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ User ID และจำนวนเครดิต'
      })
    }

    const creditAmountInt = parseInt(creditAmount)
    if (isNaN(creditAmountInt) || creditAmountInt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'จำนวนเครดิตต้องเป็นตัวเลขมากกว่า 0'
      })
    }

    // Add credits to user in database
    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user) {
      await prisma.$disconnect();
      return res.status(404).json({
        success: false,
        message: `ไม่พบผู้ใช้ ${userId} ในระบบ`
      });
    }

    // Update user credits
    const updatedUser = await prisma.user.update({
      where: { userId },
      data: {
        credits: {
          increment: creditAmountInt
        }
      }
    });

    await prisma.$disconnect();

    // Log the credit addition
    const logMessage = reason || `Admin added ${creditAmountInt} credits`;
    console.log(`✅ Credits added: ${userId} +${creditAmountInt} (${logMessage})`);

    // Return success
    return res.status(200).json({
      success: true,
      message: isInternal
        ? `คืนเครดิต ${creditAmountInt} หน่วยสำเร็จ`
        : `เพิ่มเครดิต ${creditAmountInt} หน่วยสำเร็จ`,
      newBalance: updatedUser.credits,
      creditsAdded: creditAmountInt
    })

  } catch (error) {
    console.error('Add credits error:', error)
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มเครดิต',
      error: error.message
    })
  }
}