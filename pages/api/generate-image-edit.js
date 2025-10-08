import { GoogleGenAI } from "@google/genai"

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
    const { image, editInstruction, apiKey, aspectRatio = '1:1' } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    if (!editInstruction || editInstruction.trim() === '') {
      return res.status(400).json({ error: 'No edit instruction provided' })
    }

    // Use Gemini API key
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || 'AIzaSyD0n9MuVEpgDDyXjWBp9O4LpRpSRYe_8aY'

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    console.log(`✏️ Applying image edit: "${editInstruction}"`)

    // Create comprehensive edit prompt with instruction
    const editPrompt = `You are an expert image editor. Edit this image according to the following instruction:

"${editInstruction}"

Requirements:
- Follow the edit instruction precisely and carefully
- Maintain the overall quality and resolution of the image
- Keep unaffected areas exactly the same as the original
- Ensure smooth blending and natural transitions
- Preserve the original style and lighting unless specified otherwise
- Make the edit look professional and realistic
- Pay attention to shadows, lighting, and perspective

Common edit types and how to handle them:
- Remove object: Cleanly remove the specified object and fill the area naturally with appropriate background
- Add object: Add the requested object naturally, matching lighting and perspective
- Change color: Apply the color change while maintaining texture and details
- Change background: Replace background smoothly while keeping the foreground subject intact
- Enhance/improve: Apply professional enhancements while keeping it natural
- Replace element: Swap the element while maintaining visual consistency

Execute the edit instruction now and return the edited image.`

    // Prepare request body with image and edit instruction
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [
          {
            text: editPrompt
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
        temperature: 0.3, // Lower temperature for more precise edits
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 8192,
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    }

    // Use Gemini 2.5 Flash Image Preview model for image editing
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

    // Extract edited image from response
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
      console.log(`✅ Image edit successful!`)

      return res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        editInstruction: editInstruction,
        description: description || `Image edited: ${editInstruction}`,
        model: modelName,
        message: '✨ แก้ไขภาพสำเร็จ!'
      })
    }

    // If no image generated, return error
    throw new Error('No edited image generated')

  } catch (error) {
    console.error('❌ Image edit error:', error)
    res.status(500).json({
      error: error.message || 'Failed to edit image',
      details: error.toString(),
      suggestion: 'ตรวจสอบ API key และคำสั่งแก้ไข ลองใหม่อีกครั้ง'
    })
  }
}
