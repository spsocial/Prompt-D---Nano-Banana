export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { slipImage, expectedAmount, userId } = req.body

    if (!slipImage || !expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัพโหลดสลิปและระบุจำนวนเงิน'
      })
    }

    // EasySlip API Token ของคุณ
    const EASYSLIP_TOKEN = 'bf4c6851-0df7-4020-8488-cfe5a7f4f276'

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
    console.log('EasySlip Response:', slipData)

    // ตรวจสอบผลการอ่านสลิป
    if (!slipData.success || !slipData.data) {
      return res.status(200).json({
        success: false,
        message: 'ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณาถ่ายภาพให้ชัดเจน'
      })
    }

    // ดึงข้อมูลจากสลิป
    const {
      amount,
      receiver_account_name,
      sender_account_name,
      transaction_date,
      transaction_ref
    } = slipData.data

    // ตรวจสอบจำนวนเงิน
    const slipAmount = parseFloat(amount?.value || amount || 0)
    const expected = parseFloat(expectedAmount)

    console.log('Slip Amount:', slipAmount, 'Expected:', expected)

    // ตรวจสอบว่าจำนวนเงินตรงกัน (ยอมให้ผิดพลาด +/- 1 บาท)
    if (Math.abs(slipAmount - expected) > 1) {
      return res.status(200).json({
        success: false,
        message: `จำนวนเงินไม่ตรงกัน (สลิป: ${slipAmount} บาท, ต้องการ: ${expected} บาท)`
      })
    }

    // ตรวจสอบชื่อผู้รับ (ถ้ามี)
    const receiverName = receiver_account_name?.value || receiver_account_name || ''

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
      transactionRef: transaction_ref?.value || transaction_ref || 'N/A',
      transactionDate: transaction_date?.value || transaction_date || new Date().toISOString(),
      senderName: sender_account_name?.value || sender_account_name || 'Unknown',
      receiverName: receiverName,
      timestamp: new Date().toISOString()
    }

    console.log('Payment Record:', paymentRecord)

    // TODO: บันทึกลง database และเพิ่มเครดิตให้ user

    return res.status(200).json({
      success: true,
      message: 'ยืนยันการชำระเงินสำเร็จ',
      data: {
        amount: slipAmount,
        transactionRef: paymentRecord.transactionRef,
        userId: userId
      }
    })

  } catch (error) {
    console.error('Verify slip error:', error)
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป',
      error: error.message
    })
  }
}