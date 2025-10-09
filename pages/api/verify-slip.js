import { PrismaClient } from '@prisma/client';
import { trackPayment } from '../../lib/analytics-db';
import { safeLog, truncateDataUri } from '../../lib/logUtils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { slipImage, expectedAmount, userId, packageName, credits } = req.body

    if (!slipImage || !expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัพโหลดสลิปและระบุจำนวนเงิน'
      })
    }

    // EasySlip API Token จาก environment variable
    const EASYSLIP_TOKEN = process.env.EASYSLIP_API_TOKEN || 'bf4c6851-0df7-4020-8488-cfe5a7f4f276'

    // เรียก EasySlip API
    const easySlipResponse = await fetch('https://developer.easyslip.com/api/v1/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYSLIP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: slipImage
      })
    })

    if (!easySlipResponse.ok) {
      console.error('EasySlip API Error:', easySlipResponse.status)
      return res.status(200).json({
        success: false,
        message: 'ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณาตรวจสอบภาพ'
      })
    }

    const slipData = await easySlipResponse.json()
    safeLog('EasySlip Response:', slipData)

    // ตรวจสอบผลการอ่านสลิป - รองรับ format ใหม่
    if (!slipData || !slipData.data) {
      return res.status(200).json({
        success: false,
        message: 'ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณาถ่ายภาพให้ชัดเจน'
      })
    }

    // ดึงข้อมูลจากสลิป - รองรับ format ใหม่
    const data = slipData.data

    // ตรวจสอบจำนวนเงิน - format ใหม่
    const slipAmount = data.amount?.amount || data.amount || 0
    const expected = parseFloat(expectedAmount)

    console.log('Slip Amount:', slipAmount, 'Expected:', expected)

    // ตรวจสอบว่าจำนวนเงินตรงกัน (ยอมให้ผิดพลาด +/- 1 บาท)
    if (Math.abs(slipAmount - expected) > 1) {
      return res.status(200).json({
        success: false,
        message: `จำนวนเงินไม่ตรงกัน (สลิป: ${slipAmount} บาท, ต้องการ: ${expected} บาท)`
      })
    }

    // ตรวจสอบชื่อผู้รับ (ถ้ามี) - format ใหม่
    const receiverName = data.receiver?.account?.name?.th ||
                        data.receiver?.account?.displayName || ''

    const senderBank = data.sender?.bank?.short || data.sender?.bank?.name || ''
    const senderAccount = data.sender?.account?.name?.th ||
                          data.sender?.account?.proxy?.value ||
                          'Unknown'

    // ในระบบจริง ควรตรวจสอบว่าโอนมาที่บัญชีเราจริงๆ
    // if (!receiverName.includes('พรอมท์') && !receiverName.includes('Prompt')) {
    //   return res.status(200).json({
    //     success: false,
    //     message: 'บัญชีผู้รับไม่ถูกต้อง'
    //   })
    // }

    // บันทึกข้อมูลการชำระเงิน (ในระบบจริงควรบันทึกลง database)
    const paymentRecord = {
      userId,
      amount: slipAmount,
      transactionRef: data.transRef || 'N/A',
      transactionDate: data.date || new Date().toISOString(),
      senderName: senderAccount,
      senderBank: senderBank,
      receiverName: receiverName,
      timestamp: new Date().toISOString()
    }

    safeLog('Payment Record:', paymentRecord)

    // บันทึกลง database และเพิ่มเครดิตให้ user
    try {
      // Add credits to user in database
      const creditsToAdd = credits || Math.floor(slipAmount / 0.5); // Default: 1 credit per 0.5 baht

      // Update user credits in database
      const updatedUser = await prisma.user.upsert({
        where: { userId: userId },
        update: {
          credits: { increment: creditsToAdd },
          lastActive: new Date()
        },
        create: {
          userId: userId,
          firstSeen: new Date(),
          lastActive: new Date(),
          totalGenerated: 0,
          totalSpent: 0,
          credits: creditsToAdd,
          creditsUsed: 0
        }
      });

      // Track payment in analytics
      await trackPayment(
        userId,
        slipAmount,
        packageName || `เติมเครดิต ${creditsToAdd} เครดิต`,
        paymentRecord.transactionRef
      );

      console.log('Credits added successfully:', updatedUser);

      return res.status(200).json({
        success: true,
        message: 'ยืนยันการชำระเงินสำเร็จ',
        data: {
          amount: slipAmount,
          transactionRef: paymentRecord.transactionRef,
          userId: userId,
          credits: creditsToAdd,
          newBalance: updatedUser.credits
        }
      })
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Even if database fails, return success since payment was verified
      return res.status(200).json({
        success: true,
        message: 'ยืนยันการชำระเงินสำเร็จ',
        data: {
          amount: slipAmount,
          transactionRef: paymentRecord.transactionRef,
          userId: userId
        }
      })
    }

  } catch (error) {
    console.error('Verify slip error:', error)
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป',
      error: error.message
    })
  }
}