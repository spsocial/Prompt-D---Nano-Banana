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
    const {
      prompt,
      image, // optional - for image-to-image
      aspectRatio = '1:1',
      apiKey
    } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Use Gemini API key
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key is required' })
    }

    console.log('🎨 Generating with gemini-2.0-flash-exp...')
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...')
    console.log('🖼️ Image provided:', !!image)
    if (image) {
      console.log('📸 Image size:', truncateDataUri(image))
    }
    console.log('📐 Aspect Ratio:', aspectRatio)

    // Model name
    const modelName = 'gemini-2.0-flash-exp'

    // Prepare request body
    let requestBody

    if (image) {
      // Image-to-Image mode
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

      requestBody = {
        contents: [{
          role: 'user',
          parts: [
            {
              text: prompt
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
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
          responseModalities: ['Text', 'Image'], // IMPORTANT: Enable image generation
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      }
    } else {
      // Text-to-Image mode
      requestBody = {
        contents: [{
          role: 'user',
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
          responseModalities: ['Text', 'Image'], // IMPORTANT: Enable image generation
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      }
    }

    console.log('🚀 Calling Gemini API...')

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
      console.error('❌ Gemini API Error:', errorData)
      throw new Error(JSON.stringify(errorData))
    }

    const responseData = await response.json()
    console.log('✅ Response received from Gemini')

    // Parse response
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
            console.log('📝 Description received')
          }

          // Check for media URL
          if (part.media) {
            imageUrl = part.media
            imageGenerated = true
            console.log('✅ Image URL received!')
          }

          // Check for inline data (base64)
          if (part.inlineData) {
            const imageData = part.inlineData.data
            const mimeType = part.inlineData.mimeType || 'image/png'
            imageUrl = `data:${mimeType};base64,${imageData}`
            imageGenerated = true
            console.log('✅ Image generated (base64)!')
          }
        }
      }
    }

    if (!imageGenerated || !imageUrl) {
      console.error('❌ No image generated')
      return res.status(500).json({
        error: 'No image generated',
        details: 'Gemini 2.0 Exp might not have generated an image',
        suggestion: 'Try different prompt or check API permissions'
      })
    }

    // Success!
    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      description: description || 'Generated with Gemini 2.0 Experimental',
      prompt: prompt,
      model: modelName,
      mode: image ? 'image-to-image' : 'text-to-image',
      aspectRatio: aspectRatio,
      message: '✨ ภาพถูกสร้างเรียบร้อยแล้ว!'
    })

  } catch (error) {
    console.error('❌ Generation error:', error.message)
    // Don't log full error object which may contain image data

    res.status(500).json({
      error: error.message || 'Failed to generate image',
      details: error.toString(),
      suggestion: 'ตรวจสอบ API key และลองใหม่อีกครั้ง'
    })
  }
}
