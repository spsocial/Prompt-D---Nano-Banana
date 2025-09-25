import { GoogleGenAI } from "@google/genai"
// Don't import analytics here to avoid client-side dependencies

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
    const { image, apiKey, customPrompt, selectedStyle } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    // Use Gemini API key
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || 'AIzaSyCaUEO45dTltA6huicctEvJEOT0GC4Qzsg'

    // Initialize with correct package
    const ai = new GoogleGenAI({ apiKey: geminiApiKey })

    // Convert base64 to proper format
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    // Analyze image with Gemini
    const analysisPrompt = `วิเคราะห์ภาพสินค้านี้และระบุรายละเอียดต่อไปนี้:
    1. ประเภทและหมวดหมู่ของสินค้า
    2. ลักษณะเด่นของสินค้า (สี, พื้นผิว, วัสดุ)
    3. กลุ่มเป้าหมาย
    4. จุดขายที่สำคัญ
    5. อารมณ์และความรู้สึกที่ต้องการสื่อ

    ตอบเป็นภาษาไทยแบบกระชับและชัดเจน`

    // Use text generation model for analysis
    const analysisResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          text: analysisPrompt
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        }
      ]
    })

    let analysis = ''
    if (analysisResponse.candidates && analysisResponse.candidates[0]) {
      const parts = analysisResponse.candidates[0].content.parts
      if (parts) {
        for (const part of parts) {
          if (part.text) {
            analysis += part.text
          }
        }
      }
    }

    // Premium base prompt
    const premiumBasePrompt = customPrompt || `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ ในบรรยากาศที่หรูหราและทรงพลัง ถ่ายทอดความรู้สึกระดับพรีเมียมอย่างชัดเจน ออกแบบการจัดวางองค์ประกอบภาพอย่างพิถีพิถันเหมือนงานโฆษณามืออาชีพ จัดแสงเงาให้โดดเด่นและเสริมความงามของตัวสินค้า พร้อมเลือกฉากหลังที่มีความหรูหรา กลมกลืน และสื่อถึงคุณค่าของแบรนด์
ภาพที่ได้ต้องคมชัดในระดับไฮเปอร์เรียลลิสติก รายละเอียดสมจริงทุกมุมมอง โทนสีเน้นความมีระดับ สะท้อนภาพลักษณ์ที่น่าเชื่อถือ ดูทันสมัย และสร้างแรงดึงดูดให้ผู้ชมรู้สึกว่าผลิตภัณฑ์นี้มีคุณค่าเหนือกว่าใคร`

    // Premium generates 2 images with 2 variations each = 4 total for display
    // But we count it as 2 images for tracking
    const actualImageCount = 2; // Premium package generates 2 actual images

    // Create 4 style variations for display (2 main styles x 2 variations)
    let styleNames = []

    // Determine style names based on selected prompt style
    if (selectedStyle === 'floating') {
      styleNames = [
        "ลอยในอากาศ - สไตล์ 1",
        "ลอยในอากาศ - สไตล์ 2",
        "ลอยในอากาศ - สไตล์ 3",
        "ลอยในอากาศ - สไตล์ 4"
      ]
    } else if (selectedStyle === 'moody') {
      styleNames = [
        "โทนภาพ Moody - สไตล์ 1",
        "โทนภาพ Moody - สไตล์ 2",
        "โทนภาพ Moody - สไตล์ 3",
        "โทนภาพ Moody - สไตล์ 4"
      ]
    } else if (selectedStyle === 'cinematic') {
      styleNames = [
        "3D Cinematic - สไตล์ 1",
        "3D Cinematic - สไตล์ 2",
        "3D Cinematic - สไตล์ 3",
        "3D Cinematic - สไตล์ 4"
      ]
    } else if (selectedStyle === 'custom') {
      styleNames = [
        "Custom - สไตล์ 1",
        "Custom - สไตล์ 2",
        "Custom - สไตล์ 3",
        "Custom - สไตล์ 4"
      ]
    } else {
      // Default to premium style names
      styleNames = [
        "พรีเมี่ยมหรูหรา - สไตล์ 1",
        "พรีเมี่ยมหรูหรา - สไตล์ 2",
        "พรีเมี่ยมหรูหรา - สไตล์ 3",
        "พรีเมี่ยมหรูหรา - สไตล์ 4"
      ]
    }

    const prompts = styleNames.map((styleName) => ({
      style: styleName,
      prompt: premiumBasePrompt
    }))

    // Track image generation via API call instead of direct import
    if (req.body.userId) {
      // Make internal API call to track analytics
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.RAILWAY_STATIC_URL
          ? `https://${process.env.RAILWAY_STATIC_URL}`
          : 'http://localhost:3000';

        // Track the ACTUAL number of images (2 for premium, not 4 style variations)
        const mainStyle = selectedStyle || 'premium';
        await fetch(`${baseUrl}/api/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'trackImage',
            data: {
              userId: req.body.userId,
              style: mainStyle, // Use main style only
              prompt: `Generated ${actualImageCount} images` // Track 2, not 4
            }
          })
        }).catch(err => console.log('Analytics tracking failed:', err));
      } catch (error) {
        console.log('Analytics tracking error:', error);
      }
    }

    res.status(200).json({
      analysis,
      prompts,
      premiumPrompt: premiumBasePrompt,
      success: true
    })

  } catch (error) {
    console.error('Vision analysis error:', error)
    res.status(500).json({
      error: error.message || 'Failed to analyze image',
      details: error.response?.data?.error || null
    })
  }
}