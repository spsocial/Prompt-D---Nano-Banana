export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, credits, adminPassword } = req.body

    // Validate admin password
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nano2024'

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึง'
      })
    }

    // Validate inputs
    if (!userId || !credits) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ User ID และจำนวนเครดิต'
      })
    }

    const creditAmount = parseInt(credits)
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'จำนวนเครดิตต้องเป็นตัวเลขมากกว่า 0'
      })
    }

    // Generate a unique credit code for this transaction
    const creditCode = `ADMIN_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Store credit allocation in a way that can be retrieved by the user
    // In a real application, this would be stored in a database
    // For now, we'll return the credit code that the admin can give to the user

    const creditData = {
      userId,
      credits: creditAmount,
      code: creditCode,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      used: false
    }

    // Log the credit allocation (in production, save to database)
    console.log('Credit Allocation:', creditData)

    // Return success with credit code
    return res.status(200).json({
      success: true,
      message: `สร้างโค้ดเครดิต ${creditAmount} หน่วยสำเร็จ`,
      data: {
        userId,
        credits: creditAmount,
        code: creditCode,
        instruction: `ให้ผู้ใช้กรอกโค้ด: ${creditCode} ในระบบเพื่อรับเครดิต`
      }
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