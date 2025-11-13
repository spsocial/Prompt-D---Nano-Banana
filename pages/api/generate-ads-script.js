import { safeLog, truncateDataUri } from '../../lib/logUtils';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, productName, userInput, duration, gender } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' })
    }

    // Use Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyCaUEO45dTltA6huicctEvJEOT0GC4Qzsg'

    // Convert base64 to proper format
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    console.log('🎙️ Analyzing product for ads script:', productName)

    // Determine word count target based on duration
    const wordTarget = duration === 10 ? '25-30 คำ' : '40-45 คำ'
    const genderSuffix = gender === 'female' ? 'ค่ะ' : 'ครับ'

    // Create prompt for Gemini to analyze and generate script
    const analysisPrompt = `วิเคราะห์รูปสินค้านี้ (${productName}) และสร้างบทพูดโฆษณาสั้นๆ กระชับ ประมาณ ${wordTarget}

${userInput ? `คีย์เวิร์ดที่ต้องใช้: ${userInput}` : ''}

กฎสำคัญ:
1. พูดแนวกระชับ เน้นขายของ ไม่ต้องยืดยาว
2. เน้นจุดเด่นของสินค้าจากรูปที่เห็น
3. สร้างความเร่งด่วน (เช่น รีบสั่งเลย, ของดีต้องไม่พลาด)
4. ต้องลงท้ายด้วย: "จิ้มที่ตระก้าได้เลย${genderSuffix}"
5. ห้ามใช้คำยากหรือยาวเกินไป
6. ห้ามมีคำหยาบหรือไม่สุภาพ
7. ถ้ามี userInput ให้นำมาใช้ในบทพูดด้วย

ตัวอย่างรูปแบบ:
"${productName} {จุดเด่น} {ความพิเศษ} {คำกระตุ้น} จิ้มที่ตระก้าได้เลย${genderSuffix}!"

ให้แค่บทพูดอย่างเดียว ไม่ต้องอธิบาย ไม่ต้องมีเครื่องหมายคำพูด`

    // Call Gemini API - use gemini-2.5-flash-image-preview for vision
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`

    const requestBody = {
      contents: [{
        parts: [
          { text: analysisPrompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      }
    }

    const analysisResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.text()
      console.error('Gemini API error:', errorData)
      throw new Error(`Gemini API error: ${analysisResponse.status}`)
    }

    const analysisResult = await analysisResponse.json()

    let script = ''
    if (analysisResult.candidates && analysisResult.candidates[0]) {
      const parts = analysisResult.candidates[0].content?.parts
      if (parts) {
        for (const part of parts) {
          if (part.text) {
            script += part.text
          }
        }
      }
    }

    // Clean up the script (remove quotes if present, trim whitespace)
    script = script.trim().replace(/^["']|["']$/g, '')

    // Ensure it ends with the required suffix (check if it already ends with it to prevent doubling)
    const endsWithPhrase = script.endsWith('จิ้มที่ตระก้าได้เลยค่ะ') ||
                          script.endsWith('จิ้มที่ตระก้าได้เลยครับ') ||
                          script.endsWith('จิ้มที่ตระก้าได้เลยค่ะ!') ||
                          script.endsWith('จิ้มที่ตระก้าได้เลยครับ!') ||
                          script.endsWith('จิ้มที่ตระก้าได้เลย') ||
                          script.endsWith('จิ้มที่ตระก้าได้เลย!')

    if (!endsWithPhrase) {
      // Only append if not already at the end
      script += ` จิ้มที่ตระก้าได้เลย${genderSuffix}!`
    }

    console.log('✅ Generated script:', script)

    res.status(200).json({
      script,
      success: true
    })

  } catch (error) {
    console.error('Ads script generation error:', error.message)
    res.status(500).json({
      error: error.message || 'Failed to generate ads script',
      details: error.response?.data?.error || null
    })
  }
}
