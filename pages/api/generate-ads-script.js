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
    const { image, productName, userInput, duration, gender, mode } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    // ProductName is optional for voice mode
    const isVoiceMode = mode === 'voice'
    if (!isVoiceMode && !productName) {
      return res.status(400).json({ error: 'Product name is required' })
    }

    // Use Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyCaUEO45dTltA6huicctEvJEOT0GC4Qzsg'

    // Convert base64 to proper format
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    console.log(`🎙️ Analyzing ${isVoiceMode ? 'image for voice script' : 'product for ads script'}:`, productName || 'No product name')

    // Calculate word target based on duration (Thai: ~3 chars per word, ~17 chars/sec)
    const estimatedWords = Math.floor(duration / 2) // Rough estimate: 2 seconds per word
    const wordTarget = `${estimatedWords - 5}-${estimatedWords + 5} คำ`
    const genderSuffix = gender === 'female' ? 'ค่ะ' : 'ครับ'

    // Create prompt based on mode
    let analysisPrompt

    if (isVoiceMode) {
      // Voice mode: General narration/description
      const genderTone = gender === 'female' ? 'ผู้หญิง (ใช้คำสุภาพ "ค่ะ")' : 'ผู้ชาย (ใช้คำสุภาพ "ครับ")'

      analysisPrompt = `วิเคราะห์รูปภาพนี้และสร้างบทพูดสำหรับพากย์เสียง ระยะเวลาประมาณ ${duration} วินาที (${wordTarget})

ผู้พูด: ${genderTone}

${userInput ? `บริบท/คำแนะนำ: ${userInput}` : ''}

กฎสำคัญ:
1. อธิบายสิ่งที่เห็นในรูปอย่างละเอียดและน่าสนใจ
2. ใช้ภาษาที่เป็นธรรมชาติ เหมือนคนพูด
3. ความยาวให้พอดีกับเวลา ${duration} วินาที
4. ไม่ต้องมีคำเรียกร้องให้ซื้อ (ไม่ใช่โฆษณา)
5. พูดแบบนักบรรยาย หรือผู้บรรยายในสารคดี
6. ถ้ามี userInput ให้นำบริบทมาใช้ในบทพูด
7. ใช้คำสุภาพที่เหมาะสมกับเพศผู้พูด (${gender === 'female' ? 'ค่ะ' : 'ครับ'})

ให้แค่บทพูดอย่างเดียว ไม่ต้องอธิบาย ไม่ต้องมีเครื่องหมายคำพูด`
    } else {
      // Ads mode: Sales-focused
      analysisPrompt = `วิเคราะห์รูปสินค้านี้ (${productName}) และสร้างบทพูดโฆษณาสั้นๆ กระชับ ประมาณ ${wordTarget}

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
    }

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

    // IMPORTANT: Fix ALL wrong spellings to correct "ตระก้า"
    // Gemini generates multiple wrong versions:
    // - "ตะกร้า" (missing ร at ต)
    // - "ตระกร้า" (wrong ร in middle)
    script = script.replace(/ตะกร้า/g, 'ตระก้า')     // Fix: ตะกร้า → ตระก้า
    script = script.replace(/ตระกร้า/g, 'ตระก้า')    // Fix: ตระกร้า → ตระก้า

    // Remove duplicate ending phrases (Gemini sometimes generates the ending twice)
    // Match patterns like: "จิ้มที่ตระก้าได้เลย[ค่ะ/ครับ][!]? จิ้มที่ตระก้าได้เลย[ค่ะ/ครับ][!]?"
    const duplicatePattern = /(จิ้มที่ตระก้าได้เลย(?:ค่ะ|ครับ)!?)\s+\1/g
    script = script.replace(duplicatePattern, '$1')

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
