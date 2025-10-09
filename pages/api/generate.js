import { GoogleGenAI } from "@google/genai"
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
    const { prompts, apiKey, replicateApiKey, originalImage, aspectRatio = '1:1' } = req.body

    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'No prompts provided' })
    }

    // Use Gemini API key
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || 'AIzaSyD0n9MuVEpgDDyXjWBp9O4LpRpSRYe_8aY'

    // Initialize with correct package
    const ai = new GoogleGenAI({ apiKey: geminiApiKey })

    // Check quota status first
    const quotaCheckResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
    )
    const quotaOk = quotaCheckResponse.ok

    if (!quotaOk) {
      console.log('⚠️ API key might have issues, using mock generator')
      const mockResponse = await fetch(
        `${req.headers.origin || 'http://localhost:3000'}/api/generate-mock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts, originalImage })
        }
      )

      if (mockResponse.ok) {
        const mockData = await mockResponse.json()
        return res.status(200).json({
          ...mockData,
          warning: 'Using mock images due to API issues'
        })
      }
    }

    // Generate images sequentially to avoid rate limiting
    const results = []
    let quotaExhausted = false

    for (let index = 0; index < prompts.length; index++) {
      const promptData = prompts[index]

      // Skip if quota already exhausted
      if (quotaExhausted) {
        results.push({
          style: promptData.style,
          imageUrl: `/api/placeholder?style=${encodeURIComponent(promptData.style)}&seed=${Date.now()}_${index}`,
          description: 'Quota exhausted - skipped',
          isPlaceholder: true,
          isQuotaError: true
        })
        continue
      }

      const result = await (async () => {
        try {
          console.log(`🎨 Generating image ${index + 1}: ${promptData.style}`)
          if (originalImage && index === 0) {
            console.log('📸 Original image size:', truncateDataUri(originalImage))
          }

          // Prepare request body with image if provided
          let requestBody

          if (originalImage) {
            // Extract base64 data from data URL
            const base64Data = originalImage.replace(/^data:image\/\w+;base64,/, '')

            // Include both image and text in the request
            requestBody = {
              contents: [{
                role: 'user',
                parts: [
                  {
                    text: `${promptData.prompt}

Requirements:
- Create a premium advertisement from the provided product image
- Professional quality commercial style
- Maintain product recognizability
- ${promptData.style} aesthetic
- Hyperrealistic quality with dramatic lighting`
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
                imageConfig: {
                  aspectRatio: aspectRatio
                }
              }
            }
          } else {
            // Text-only prompt
            requestBody = {
              contents: [{
                role: 'user',
                parts: [{
                  text: `Create a photorealistic product advertisement image: ${promptData.prompt}

${promptData.style} style with premium quality`
                }]
              }],
              generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 8192,
                imageConfig: {
                  aspectRatio: aspectRatio
                }
              }
            }
          }

          // Use different models based on whether we have an image
          const modelName = originalImage
            ? 'gemini-2.5-flash-image-preview'  // Image-to-Image: use preview model
            : 'gemini-2.5-flash-image'           // Text-to-Image: use standard model

          console.log(`🎨 Calling ${modelName} API...`)

          // Add delay between requests to avoid rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
          }

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

          // Check for generated image in response
          let imageGenerated = false
          let imageUrl = null
          let description = ''

          if (responseData.candidates && responseData.candidates[0]) {
            const candidate = responseData.candidates[0]

            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                // Check for text
                if (part.text) {
                  description = part.text
                  console.log(`📝 Description received for ${promptData.style}`)
                }

                // Check for media/image URL
                if (part.media) {
                  imageUrl = part.media
                  imageGenerated = true
                  console.log(`✅ Image URL received for ${promptData.style}!`)
                }

                // Check for inline data
                if (part.inlineData) {
                  const imageData = part.inlineData.data
                  const mimeType = part.inlineData.mimeType || 'image/png'

                  // Convert to data URL
                  imageUrl = `data:${mimeType};base64,${imageData}`
                  imageGenerated = true
                  console.log(`✅ Image generated for ${promptData.style}!`)
                }
              }
            }
          }

          // Return successful result
          if (imageGenerated && imageUrl) {
            return {
              style: promptData.style,
              imageUrl: imageUrl,
              description: description || `Premium ${promptData.style} advertisement`,
              prompt: promptData.prompt,
              isGenerated: true,
              model: 'gemini-2.5-flash-image-preview'
            }
          }

          // If no image generated, try Replicate fallback
          if (!imageGenerated && replicateApiKey) {
            console.log(`⚡ Trying Replicate fallback for ${promptData.style}`)

            const replicateResponse = await fetch(
              `${req.headers.origin || 'http://localhost:3000'}/api/generate-image`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompts: [promptData],
                  replicateApiKey
                })
              }
            )

            if (replicateResponse.ok) {
              const data = await replicateResponse.json()
              if (data.results && data.results[0]) {
                return data.results[0]
              }
            }
          }

          // Fallback to placeholder
          console.log(`⚠️ Using placeholder for ${promptData.style}`)
          return {
            style: promptData.style,
            imageUrl: `/api/placeholder?style=${encodeURIComponent(promptData.style)}&seed=${Date.now()}_${index}`,
            description: description || 'Premium advertisement concept',
            prompt: promptData.prompt,
            isPlaceholder: true,
            note: 'Gemini image generation may require special API access'
          }

        } catch (error) {
          console.error(`❌ Error generating ${promptData.style}:`, error.message)
          // Don't log full error object which may contain image data

          // Check if it's a quota error
          const errorStr = JSON.stringify(error.message)
          const isQuotaError = errorStr.includes('429') ||
                               errorStr.includes('quota') ||
                               errorStr.includes('RESOURCE_EXHAUSTED')

          if (isQuotaError) {
            quotaExhausted = true
            console.log('🚫 Quota exhausted, stopping further requests')
          }

          // Return error with better info
          return {
            style: promptData.style,
            error: error.message,
            imageUrl: `/api/placeholder?style=error&seed=${Math.random()}`,
            isPlaceholder: true,
            isQuotaError
          }
        }
      })()
      results.push(result)

      // Add delay between requests to respect rate limits
      if (index < prompts.length - 1 && !quotaExhausted) {
        console.log('⏳ Waiting 5 seconds before next request...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    // Count successful generations
    const successCount = results.filter(r => r.isGenerated).length
    const placeholderCount = results.filter(r => r.isPlaceholder).length
    const quotaErrorCount = results.filter(r => r.isQuotaError).length

    // If all requests hit quota, use mock generator
    if (quotaErrorCount === results.length) {
      console.log('🔄 All requests hit quota limit, switching to mock generator...')

      // Call mock generator
      const mockResponse = await fetch(
        `${req.headers.origin || 'http://localhost:3000'}/api/generate-mock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts })
        }
      )

      if (mockResponse.ok) {
        const mockData = await mockResponse.json()
        return res.status(200).json({
          ...mockData,
          quotaExceeded: true,
          originalError: 'API quota exceeded for all requests'
        })
      }
    }

    res.status(200).json({
      results,
      success: true,
      message: successCount > 0
        ? `✨ สร้างภาพสำเร็จ ${successCount} ภาพด้วย Gemini 2.5 Flash!`
        : quotaErrorCount > 0
        ? '⚠️ API quota หมด - ใช้ภาพตัวอย่าง'
        : placeholderCount > 0
        ? '⚠️ ใช้ภาพตัวอย่าง - ตรวจสอบ API key permissions'
        : 'Generated successfully',
      stats: {
        total: results.length,
        generated: successCount,
        placeholders: placeholderCount,
        quotaErrors: quotaErrorCount
      },
      model: 'gemini-2.5-flash-image-preview',
      info: {
        apiKeyStatus: successCount > 0 ? '✅ API key works!'
                    : quotaErrorCount > 0 ? '🔄 Quota exceeded - รอ 1 นาที'
                    : '⚠️ Check API key permissions',
        note: quotaErrorCount > 0
          ? 'ใช้ภาพ Mock ชั่วคราว - API quota หมด'
          : 'Gemini 2.5 Flash Image Preview model for image generation',
        fallback: replicateApiKey ? 'Replicate ready as backup' : 'Add Replicate key for backup'
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error.message)
    // Don't log full error object which may contain image data
    res.status(500).json({
      error: error.message || 'Failed to generate images',
      details: error.toString(),
      suggestion: 'ตรวจสอบ API key - ต้องมีสิทธิ์ใช้ gemini-2.5-flash-image-preview model',
      checkApiKey: 'ทดสอบ API key ที่ https://aistudio.google.com/app/apikey'
    })
  }
}