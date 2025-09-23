import generatePayload from 'promptpay-qr'
import qrcode from 'qrcode'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // หมายเลขโทรศัพท์ PromptPay ของคุณ
    const PROMPTPAY_ID = '0902462826'

    // สร้าง PromptPay payload
    const payload = generatePayload(PROMPTPAY_ID, { amount: parseFloat(amount) })

    // สร้าง QR Code เป็น base64
    const qrCodeDataUrl = await qrcode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    res.status(200).json({
      success: true,
      qrCode: qrCodeDataUrl,
      amount: amount,
      promptpayId: PROMPTPAY_ID
    })
  } catch (error) {
    console.error('QR Generation error:', error)
    res.status(500).json({
      error: 'Failed to generate QR code',
      message: error.message
    })
  }
}