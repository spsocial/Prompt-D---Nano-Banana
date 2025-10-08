import { GoogleGenAI } from "@google/genai"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

// Style transfer prompts for different styles
const styleTransferPrompts = {
  'Van Gogh': `Transform this image into Van Gogh's iconic painting style.
Apply bold, visible brushstrokes with swirling patterns and energetic movement.
Use rich, vibrant colors with strong contrasts - deep blues, bright yellows, intense greens.
Create texture and depth through thick impasto technique.
Maintain the original composition but interpret it with Van Gogh's post-impressionist aesthetic.
The result should look like it was painted in the late 1800s with passionate, expressive brushwork.`,

  'Anime': `Transform this image into high-quality anime art style.
Convert the subject into anime/manga aesthetic with:
- Large, expressive eyes with detailed highlights
- Smooth, cel-shaded coloring with clean linework
- Vibrant, saturated colors typical of modern anime
- Simplified but beautiful background
- Dynamic lighting with dramatic shadows
- Professional anime studio quality (similar to Makoto Shinkai or Studio Ghibli style)
Keep the original composition but make it look like a frame from a high-budget anime production.`,

  'Watercolor': `Transform this image into a beautiful watercolor painting.
Apply soft, translucent watercolor techniques with:
- Delicate, flowing washes of color that blend naturally
- Visible paper texture showing through the paint
- Soft edges and gentle color gradients
- Light, airy feeling with white spaces
- Subtle color bleeding effects at edges
- Artistic interpretation with loose, expressive strokes
- Maintain recognizability while achieving authentic watercolor aesthetics
The result should look hand-painted with real watercolors on textured paper.`,

  'Oil Painting': `Transform this image into a classical oil painting masterpiece.
Apply traditional oil painting techniques with:
- Rich, thick paint texture with visible brushstrokes
- Deep, luminous colors with classical color harmony
- Dramatic chiaroscuro lighting (strong light and shadow contrast)
- Smooth blending and glazing effects
- Renaissance or Baroque era painting aesthetics
- Professional artist-quality composition
- Textured canvas visible underneath
The result should look like it was painted by an old master with years of experience.`,

  'Sketch': `Transform this image into a detailed pencil sketch drawing.
Create a professional pencil drawing with:
- Clean, confident line work with varying thickness
- Detailed cross-hatching and shading techniques
- Realistic tonal values from light to dark
- Paper texture visible throughout
- Artistic interpretation with emphasis on form and structure
- Some areas with fine details, others with loose gestural strokes
- Professional artist sketch quality
The result should look like a hand-drawn pencil sketch on quality drawing paper.`,

  'Pop Art': `Transform this image into bold Pop Art style.
Apply vibrant pop art aesthetics with:
- Bold, bright colors (reds, yellows, blues, greens) in flat areas
- Strong outlines and defined shapes
- High contrast with dramatic shadows
- Ben-Day dots or halftone patterns in some areas
- Comic book or screen print aesthetic
- Andy Warhol or Roy Lichtenstein inspired style
- Simplified forms with graphic impact
- Contemporary and eye-catching composition
The result should look like a vibrant 1960s pop art print or poster.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, styleName, apiKey, aspectRatio = '1:1' } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    if (!styleName || !styleTransferPrompts[styleName]) {
      return res.status(400).json({
        error: 'Invalid style name',
        availableStyles: Object.keys(styleTransferPrompts)
      })
    }

    // Use Gemini API key
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || 'AIzaSyD0n9MuVEpgDDyXjWBp9O4LpRpSRYe_8aY'

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    // Get the style-specific prompt
    const stylePrompt = styleTransferPrompts[styleName]

    console.log(`🎨 Applying ${styleName} style transfer...`)

    // Prepare request body with image and style prompt
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [
          {
            text: stylePrompt
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.5,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    }

    // Use Gemini 2.5 Flash Image Preview model for style transfer
    const modelName = 'gemini-2.5-flash-image-preview'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(JSON.stringify(errorData))
    }

    const responseData = await response.json()

    // Extract generated image from response
    let imageGenerated = false
    let imageUrl = null
    let description = ''

    if (responseData.candidates && responseData.candidates[0]) {
      const candidate = responseData.candidates[0]

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Check for text description
          if (part.text) {
            description = part.text
          }

          // Check for media URL
          if (part.media) {
            imageUrl = part.media
            imageGenerated = true
          }

          // Check for inline data (base64 image)
          if (part.inlineData) {
            const imageData = part.inlineData.data
            const mimeType = part.inlineData.mimeType || 'image/png'
            imageUrl = `data:${mimeType};base64,${imageData}`
            imageGenerated = true
          }
        }
      }
    }

    if (imageGenerated && imageUrl) {
      console.log(`✅ ${styleName} style transfer successful!`)

      return res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        styleName: styleName,
        description: description || `Image transformed to ${styleName} style`,
        model: modelName,
        message: `✨ สร้างภาพสไตล์ ${styleName} สำเร็จ!`
      })
    }

    // If no image generated, return error
    throw new Error('No image generated from style transfer')

  } catch (error) {
    console.error('❌ Style transfer error:', error)
    res.status(500).json({
      error: error.message || 'Failed to apply style transfer',
      details: error.toString(),
      suggestion: 'ตรวจสอบ API key และลองใหม่อีกครั้ง'
    })
  }
}
