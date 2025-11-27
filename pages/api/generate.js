import { GoogleGenAI } from "@google/genai"
import { safeLog, truncateDataUri } from '../../lib/logUtils';
import { trackImageGeneration } from '../../lib/analytics-db';

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
    const { prompts, apiKey, replicateApiKey, originalImage, originalImages = [], aspectRatio = '1:1', userId } = req.body

    // Support both single image and multiple images
    const imagesToUse = originalImages.length > 0 ? originalImages : (originalImage ? [originalImage] : [])

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
          if (imagesToUse.length > 0 && index === 0) {
            console.log(`📸 Reference images: ${imagesToUse.length} image(s)`)
          }

          // Build enhanced prompt
          let enhancedPrompt
          if (imagesToUse.length > 0) {
            enhancedPrompt = `${promptData.prompt}

Requirements:
- Create a premium advertisement from the provided product image(s)
- Professional quality commercial style
- Maintain product recognizability
- ${promptData.style} aesthetic
- Hyperrealistic quality with dramatic lighting`
          } else {
            enhancedPrompt = `Create a photorealistic product advertisement image: ${promptData.prompt}

${promptData.style} style with premium quality`
          }

          console.log(`🎨 Calling KIE.AI API...`)

          // Add delay between requests to avoid rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
          }

          // Call KIE.AI Nano Banana image generation endpoint
          const response = await fetch(
            `${req.headers.origin || 'http://localhost:3000'}/api/generate-image-kie`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                prompt: enhancedPrompt,
                aspectRatio: aspectRatio,
                originalImage: imagesToUse[0] || null, // For backward compatibility
                originalImages: imagesToUse, // Pass all images for multi-image mode
                userId: userId
              })
            }
          )

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'KIE.AI generation failed')
          }

          const responseData = await response.json()

          // Return successful result from KIE.AI Nano Banana
          if (responseData.success && responseData.imageUrl) {
            return {
              style: promptData.style,
              imageUrl: responseData.imageUrl,
              description: `Premium ${promptData.style} advertisement`,
              prompt: promptData.prompt,
              isGenerated: true,
              model: responseData.model || 'nano-banana'
            }
          }

          // If KIE.AI failed, try Replicate fallback
          if (replicateApiKey) {
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

    // Track successful image generations to analytics
    if (userId && successCount > 0) {
      try {
        // API cost per image: 0.68 baht (KIE.AI pricing)
        const apiCostPerImage = 0.68;

        // Track each successful generation
        for (const result of results) {
          if (result.isGenerated) {
            await trackImageGeneration(
              userId,
              result.style || 'Unknown',
              `Generated ${successCount} images: ${result.prompt || 'No prompt'}`,
              apiCostPerImage
            );
          }
        }
        console.log(`✅ Tracked ${successCount} image generations for user ${userId}`);
      } catch (trackError) {
        console.error('⚠️ Failed to track analytics:', trackError);
        // Don't fail the request if tracking fails
      }
    }

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
        ? `✨ สร้างภาพสำเร็จ ${successCount} ภาพด้วย KIE.AI Nano Banana!`
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
      model: imagesToUse.length > 0 ? 'google/nano-banana-edit' : 'google/nano-banana',
      mode: imagesToUse.length > 0 ? 'image-edit' : 'text-to-image',
      referenceImagesCount: imagesToUse.length,
      info: {
        apiKeyStatus: successCount > 0 ? '✅ KIE.AI Nano Banana API works!'
                    : quotaErrorCount > 0 ? '🔄 Quota exceeded - รอ 1 นาที'
                    : '⚠️ Check API key permissions',
        note: quotaErrorCount > 0
          ? 'ใช้ภาพ Mock ชั่วคราว - API quota หมด'
          : 'KIE.AI Nano Banana model for affordable image generation (0.68฿/image)',
        fallback: replicateApiKey ? 'Replicate ready as backup' : 'Add Replicate key for backup'
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error.message)
    // Don't log full error object which may contain image data
    res.status(500).json({
      error: error.message || 'Failed to generate images',
      details: error.toString(),
      suggestion: 'ตรวจสอบ KIE_API_KEY ใน environment variables',
      checkApiKey: 'ทดสอบ API key ที่ https://kie.ai'
    })
  }
}