import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompts, apiKey } = req.body

    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'No prompts provided' })
    }

    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || 'AIzaSyAhnMZEkrbClmHDzvUdalEiArFn9xfLvMs'
    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // Try different Gemini models that might support image generation
    const models = [
      'gemini-2.0-flash-exp', // Experimental version with potential image support
      'gemini-1.5-pro-002',    // Latest Pro version
      'gemini-1.5-flash-002',   // Latest Flash version
      'gemini-1.5-flash'        // Stable Flash version
    ]

    let workingModel = null
    let model = null

    // Try to find a model that works
    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}`)
        model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 1.2,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json" // Try JSON response for structured output
          }
        })

        // Test if model works
        const testResult = await model.generateContent("Test")
        if (testResult) {
          workingModel = modelName
          break
        }
      } catch (error) {
        console.log(`Model ${modelName} not available:`, error.message)
      }
    }

    if (!model) {
      throw new Error('No available Gemini model found')
    }

    console.log(`Using model: ${workingModel}`)

    // Generate images for each prompt
    const results = await Promise.all(
      prompts.map(async (promptData, index) => {
        try {
          // Try to generate image with enhanced prompt
          const imagePrompt = `
Create a premium product advertisement image with these specifications:

${promptData.prompt}

Technical Requirements:
- High resolution (1024x1024 or higher)
- Professional photography style
- Commercial quality
- Product-focused composition
- Premium aesthetic

Output format: Generate a detailed JSON description of the image including:
{
  "composition": "detailed layout description",
  "colors": ["hex color codes"],
  "lighting": "lighting setup description",
  "elements": ["list of visual elements"],
  "style": "visual style description",
  "mood": "atmosphere and feeling",
  "camera": "camera angle and settings",
  "background": "background description",
  "effects": ["visual effects list"],
  "text": "any text overlays or typography"
}
`

          const result = await model.generateContent(imagePrompt)
          const response = result.response
          const text = response.text()

          // Try to parse JSON response
          let imageData = {}
          try {
            // Clean the response and parse JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              imageData = JSON.parse(jsonMatch[0])
            }
          } catch (e) {
            console.log('Could not parse JSON, using text response')
          }

          // Create a detailed prompt for external services
          const detailedPrompt = `
${promptData.prompt}

Visual Details:
${imageData.composition || text.substring(0, 200)}

Color Palette: ${Array.isArray(imageData.colors) ? imageData.colors.join(', ') : '#FFD700, #FFF, #000'}
Lighting: ${imageData.lighting || 'studio lighting'}
Style: ${imageData.style || 'premium commercial photography'}
Mood: ${imageData.mood || 'luxurious and professional'}
`

          return {
            style: promptData.style,
            description: text,
            imageUrl: `/api/placeholder?style=${encodeURIComponent(promptData.style)}&seed=${Date.now()}_${index}`,
            prompt: detailedPrompt,
            imageData: imageData,
            model: workingModel,
            isPlaceholder: true,
            canGenerateWithExternal: true
          }

        } catch (error) {
          console.error('Generation error for prompt:', error)
          return {
            style: promptData.style,
            error: error.message,
            imageUrl: `/api/placeholder?style=error&seed=${Math.random()}`,
            isPlaceholder: true
          }
        }
      })
    )

    res.status(200).json({
      results,
      success: true,
      model: workingModel,
      message: 'Gemini ยังไม่รองรับการสร้างภาพโดยตรง แต่สร้าง prompt คุณภาพสูงแล้ว',
      alternatives: [
        {
          name: 'Stable Diffusion (Replicate)',
          description: 'เพิ่ม Replicate API key ในการตั้งค่าเพื่อสร้างภาพจริง',
          url: 'https://replicate.com/account/api-tokens'
        },
        {
          name: 'Google Imagen 3',
          description: 'ใช้ผ่าน Google Cloud Vertex AI (ต้องมี billing)',
          url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images'
        },
        {
          name: 'Copy Prompt',
          description: 'คัดลอก prompt ไปใช้กับ Midjourney, DALL-E, หรือ Leonardo AI'
        }
      ]
    })

  } catch (error) {
    console.error('Gemini generation error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate with Gemini',
      details: error.response?.data || null,
      suggestion: 'Gemini ยังไม่รองรับการสร้างภาพโดยตรง กรุณาใช้ Replicate API หรือบริการอื่น'
    })
  }
}