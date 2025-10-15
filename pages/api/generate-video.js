import { safeStringify } from '../../lib/logUtils';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes timeout for video generation
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      prompt,
      image,
      apiKey,
      duration = 5,
      resolution = '720p',
      aspectRatio = '16:9'
    } = req.body

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' })
    }

    // Use CometAPI key from environment variable only (no hardcoded key)
    const cometApiKey = apiKey || process.env.COMET_API_KEY

    if (!cometApiKey) {
      return res.status(400).json({
        error: 'CometAPI key is required',
        message: 'กรุณาตั้งค่า COMET_API_KEY ใน Railway environment variables',
        suggestion: '🔑 ไม่พบ API Key - กรุณาติดต่อผู้ดูแลระบบเพื่อเติมเครดิต CometAPI'
      })
    }

    console.log(`🎬 Starting Sora-2 video generation via CometAPI...`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Resolution: ${resolution}, Aspect: ${aspectRatio}`)

    // Use model name from CometAPI: sora-2 or sora-2-hd
    const modelName = resolution === '1080p' ? 'sora-2-hd' : 'sora-2'

    // Map aspect ratio + resolution to OpenAI size format (WIDTHxHEIGHT)
    // Based on official OpenAI Sora spec: 720x1280, 1280x720, 1024x1792, 1792x1024
    let size
    if (aspectRatio === '16:9') {
      // Landscape
      size = resolution === '1080p' ? '1792x1024' : '1280x720'
    } else if (aspectRatio === '9:16') {
      // Portrait
      size = resolution === '1080p' ? '1024x1792' : '720x1280'
    } else {
      // Default to landscape 720p
      size = '1280x720'
    }

    console.log(`🎯 Using model: ${modelName}`)
    console.log(`📐 Video size: ${size}`)

    // Append aspect ratio instruction to prompt
    let aspectRatioInstruction = ''
    if (aspectRatio === '16:9') {
      aspectRatioInstruction = '\n\nขนาดวิดีโอ: 16:9 แนวนอน'
    } else if (aspectRatio === '9:16') {
      aspectRatioInstruction = '\n\nขนาดวิดีโอ: 9:16 แนวตั้ง'
    }

    // Use clean prompt and append aspect ratio instruction
    const cleanPrompt = (prompt || 'Create a cinematic video') + aspectRatioInstruction

    console.log(`📝 Final prompt: ${cleanPrompt}`)

    // Prepare message content
    let messageContent

    if (image) {
      // Image-to-Video: Officially supported by CometAPI with multimodal format + max_tokens
      console.log('📸 Image-to-Video mode: Using multimodal content format')
      messageContent = [
        {
          type: 'text',
          text: cleanPrompt
        },
        {
          type: 'image_url',
          image_url: {
            url: image
          }
        }
      ]
    } else {
      // Text-to-Video: simple string content
      messageContent = cleanPrompt
    }

    // Use streaming to avoid timeout (same as veo3)
    const requestPayload = {
      model: modelName,
      stream: true, // IMPORTANT: Use streaming to avoid timeout!
      max_tokens: 3000, // Required by CometAPI for Sora 2 (especially for image-to-video)
      size: size, // IMPORTANT: Specify video dimensions (WIDTHxHEIGHT format)
      seconds: String(duration), // Duration in seconds (must be string: '4', '8', '12')
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ]
    }

    console.log('🚀 Sending request to CometAPI with streaming...')
    console.log('📦 Request payload:', safeStringify(requestPayload))

    // Call CometAPI using OpenAI-compatible endpoint
    const createResponse = await fetch('https://api.cometapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cometApiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      body: JSON.stringify(requestPayload)
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('❌ CometAPI Error Response:', errorText)
      console.error('❌ Status Code:', createResponse.status)

      let errorMessage = 'Failed to generate video via CometAPI'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.message || errorData.message || errorMessage
      } catch (e) {
        errorMessage = errorText.substring(0, 200)
      }

      throw new Error(errorMessage)
    }

    // Read streaming response (same as veo3)
    const reader = createResponse.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let taskId = null
    let previewUrl = null
    let finalUrl = null
    let accumulatedContent = '' // NEW: Accumulate all content from chunks
    let chunkCount = 0

    console.log('📡 Reading streaming response...')

    // Helper function to search for URL in accumulated content
    const searchForUrl = (content) => {
      if (!content) return null

      // Match various URL formats in markdown or plain text
      // IMPORTANT: Include query parameters (everything after .mp4 until space/bracket/etc)
      const urlPatterns = [
        /!\[([^\]]*)\]\((https?:\/\/[^\)]+\.mp4[^\)]*)\)/,  // ![text](url) with query params
        /!\[(https?:\/\/[^\]]+\.mp4[^\]]*)\]/,               // ![url] with query params
        /\[Play online[^\]]*\]\((https?:\/\/[^\)]+\.mp4[^\)]*)\)/i,  // [Play online▶️](url)
        /https?:\/\/[^\s\)\]"'<>]+\.mp4[^\s\)\]"'<>]*/      // Plain URL with query params
      ]

      for (const pattern of urlPatterns) {
        const match = content.match(pattern)
        if (match) {
          const url = match[2] || match[1] || match[0]
          if (url && url.startsWith('http')) {
            // Clean up any trailing markdown characters
            const cleanUrl = url.replace(/[\]\)]+$/, '')
            return cleanUrl
          }
        }
      }
      return null
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log('✅ Stream complete')
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || line.startsWith('data: [DONE]')) continue

        // Only log first 20 chunks to reduce noise
        if (chunkCount < 20) {
          console.log('📨 Chunk:', line.substring(0, 200))
        }

        // NEW: Try to parse JSON and extract content
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6) // Remove 'data: ' prefix
            const data = JSON.parse(jsonStr)

            // Extract content from delta
            if (data.choices?.[0]?.delta?.content) {
              const content = data.choices[0].delta.content
              accumulatedContent += content
              chunkCount++

              // Only log first 20 content additions
              if (chunkCount <= 20) {
                console.log('📝 Content added:', content.substring(0, 100))
              }

              // IMPORTANT: Search for URL every 10 chunks or when we see keywords
              if (chunkCount % 10 === 0 || content.includes('http') || content.includes('.mp4')) {
                const foundUrl = searchForUrl(accumulatedContent)
                if (foundUrl && !finalUrl) {
                  finalUrl = foundUrl
                  console.log(`✅ Found URL in accumulated content (chunk ${chunkCount}): ${finalUrl}`)
                  break
                }
              }
            }
          } catch (e) {
            // Not JSON, continue with text parsing
          }
        }

        // Extract Task ID from raw line
        if (line.includes('Task ID:') && !taskId) {
          const match = line.match(/Task ID:\s*`?([^`\s]+)`?/)
          if (match) {
            taskId = match[1]
            console.log(`✅ Task ID: ${taskId}`)
          }
        }

        // Extract URLs from raw line (backward compatibility)
        if (line.includes('Preview video') || line.includes('📺 Online Preview')) {
          const urlMatch = line.match(/https?:\/\/[^\s\)\]]+\.mp4[^\s\)\]]*/) // Include query params
          if (urlMatch) {
            previewUrl = urlMatch[0]
            console.log(`✅ Preview URL: ${previewUrl}`)
          }
        }

        if (line.includes('High-quality video') || line.includes('▶️ Watch Online') || line.includes('Play online') || line.includes('🎉')) {
          const urlMatch = line.match(/https?:\/\/[^\s\)\]]+\.mp4[^\s\)\]]*/) // Include query params
          if (urlMatch) {
            finalUrl = urlMatch[0]
            console.log(`✅ Final URL: ${finalUrl}`)
          }
        }

        // If we have final URL, break early
        if (finalUrl) {
          console.log('🎉 Final video ready, stopping stream')
          break
        }
      }

      if (finalUrl) break
    }

    console.log(`📊 Total chunks processed: ${chunkCount}`)
    console.log(`📝 Accumulated content length: ${accumulatedContent.length} characters`)

    // NEW: Extract URL from accumulated content if not found yet
    if (!finalUrl && !previewUrl && accumulatedContent) {
      console.log('🔍 Searching for URL in accumulated content (final check)...')
      console.log('📄 Full content length:', accumulatedContent.length, 'characters')

      // Use the same helper function
      const foundUrl = searchForUrl(accumulatedContent)
      if (foundUrl) {
        finalUrl = foundUrl
        console.log(`✅ Found URL in final content search: ${finalUrl}`)
      } else {
        console.log('📄 Full content preview:', accumulatedContent.substring(accumulatedContent.length - 500))
      }
    }

    // Use final URL if available, otherwise preview
    const videoUrl = finalUrl || previewUrl

    // Check for API system errors in accumulated content
    if (!videoUrl && accumulatedContent) {
      const hasSystemError = accumulatedContent.includes('network fluctuations') ||
                            accumulatedContent.includes('high load') ||
                            accumulatedContent.includes('Generation failed') ||
                            accumulatedContent.includes('Failure reason')

      if (hasSystemError) {
        console.error('❌ API System Error detected in response')
        const errorMatch = accumulatedContent.match(/Failure reason:\s*(.+?)(?:\n|$)/)
        const errorReason = errorMatch ? errorMatch[1] : 'API service is experiencing issues'
        throw new Error(`API_SYSTEM_ERROR: ${errorReason}`)
      }
    }

    if (!videoUrl) {
      console.error('❌ No video URL found in streaming response')
      throw new Error('No video URL found. The video may still be processing.')
    }

    console.log(`🎉 Sora-2 video generation complete!`)
    console.log(`📹 Video URL: ${videoUrl}`)

    // Return video URL
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      previewUrl: previewUrl,
      finalUrl: finalUrl,
      taskId: taskId,
      duration: duration,
      resolution: resolution,
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      model: modelName,
      message: '✨ Video generated successfully with Sora-2!',
      provider: 'CometAPI (Sora-2)'
    })

  } catch (error) {
    console.error('❌ CometAPI Video generation error:', error)

    // Check if it's an API system error
    const isSystemError = error.message.includes('API_SYSTEM_ERROR') ||
                         error.message.includes('network fluctuations') ||
                         error.message.includes('high load') ||
                         error.message.includes('5xx') ||
                         error.message.includes('503') ||
                         error.message.includes('502')

    // Check if it's an API availability issue
    const isApiNotAvailable = error.message.includes('Sora API is not available') ||
                               error.message.includes('not valid JSON') ||
                               error.message.includes('Unexpected token')

    // Check for quota/credit errors
    const isQuotaError = error.message.includes('quota') ||
                        error.message.includes('insufficient') ||
                        error.message.includes('not enough')

    // Try fallback to KIE.AI if enabled and it's a system error or quota issue
    const shouldTryFallback = (isSystemError || isApiNotAvailable || isQuotaError) &&
                             process.env.KIE_API_KEY

    if (shouldTryFallback) {
      console.log('🔄 CometAPI failed, attempting fallback to KIE.AI...')

      try {
        return await fallbackToKieAI(req, res)
      } catch (fallbackError) {
        console.error('❌ KIE.AI fallback also failed:', fallbackError)
        // Continue to normal error handling
      }
    }

    // Check for timeout errors
    const isTimeout = error.message.includes('504') ||
                     error.message.includes('Gateway Timeout') ||
                     error.message.includes('timed out')

    // Extract clean error message
    let cleanErrorMessage = error.message
    if (cleanErrorMessage.startsWith('API_SYSTEM_ERROR: ')) {
      cleanErrorMessage = cleanErrorMessage.replace('API_SYSTEM_ERROR: ', '')
    }

    res.status(500).json({
      error: cleanErrorMessage || 'Failed to generate video',
      details: error.toString(),
      suggestion: isSystemError
        ? '🔧 ระบบ API กำลังมีปัญหา (network fluctuations หรือ high load) - เครดิตจะถูกคืนอัตโนมัติ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
        : isTimeout
        ? '⏱️ การสร้างวิดีโอใช้เวลานาน (1-3 นาที) แต่ API timeout ก่อน - เครดิตจะถูกคืนอัตโนมัติ ลองใหม่อีกครั้งหรือติดต่อ CometAPI Support'
        : isApiNotAvailable
        ? '⚠️ Sora API ยังไม่เปิดให้ใช้งานทั่วไป - เครดิตจะถูกคืนอัตโนมัติ กรุณารอ OpenAI เปิดให้ใช้งาน'
        : isQuotaError
        ? '💳 CometAPI เครดิตไม่เพียงพอ - กรุณาเติมเครดิต CometAPI หรือรอระบบลอง KIE.AI'
        : 'เกิดข้อผิดพลาด - เครดิตจะถูกคืนอัตโนมัติ',
      apiStatus: isSystemError ? 'system_error' : isTimeout ? 'timeout' : isApiNotAvailable ? 'not_available' : isQuotaError ? 'quota_error' : 'unknown_error',
      shouldRefund: true // Always refund on error
    })
  }
}

// Fallback function to use KIE.AI when CometAPI fails
async function fallbackToKieAI(req, res) {
  console.log('🔄 Executing KIE.AI fallback...')

  const {
    prompt,
    image,
    duration = 10,
    resolution = '720p',
    aspectRatio = '16:9',
    model = 'sora-2',
    removeWatermark = false
  } = req.body

  const kieApiKey = process.env.KIE_API_KEY

  if (!kieApiKey) {
    throw new Error('KIE.AI API key not configured for fallback')
  }

  console.log(`🎬 Fallback: Starting video generation via KIE.AI...`)

  // Determine model name
  let modelName
  if (image) {
    modelName = model.includes('pro') ? 'sora-2-pro-image-to-video' : 'sora-2-image-to-video'
  } else {
    modelName = model.includes('pro') ? 'sora-2-pro-text-to-video' : 'sora-2-text-to-video'
  }

  const kieAspectRatio = aspectRatio === '16:9' ? 'landscape' : 'portrait'

  const requestBody = {
    model: modelName,
    input: {
      prompt: prompt || 'Create a cinematic video',
      aspect_ratio: kieAspectRatio,
      remove_watermark: removeWatermark
    }
  }

  // Image not supported as base64 in KIE.AI - skip fallback for image mode
  if (image) {
    throw new Error('KIE.AI requires image URLs, not base64 - cannot fallback for image-to-video')
  }

  console.log('🚀 Fallback: Creating task on KIE.AI...')

  const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${kieApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    throw new Error(`KIE.AI createTask failed: ${errorText}`)
  }

  const createData = await createResponse.json()
  const taskId = createData.data?.taskId

  if (!taskId) {
    throw new Error('No taskId from KIE.AI')
  }

  console.log(`✅ Fallback: Task created on KIE.AI: ${taskId}`)

  // Poll for results
  const maxAttempts = 60
  let attempts = 0
  let videoUrl = null

  while (attempts < maxAttempts) {
    attempts++
    await new Promise(resolve => setTimeout(resolve, 5000))

    const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${kieApiKey}` }
    })

    if (!statusResponse.ok) continue

    const statusData = await statusResponse.json()
    const state = statusData.data?.state

    if (state === 'success') {
      const resultJson = statusData.data?.resultJson

      if (resultJson) {
        const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson
        if (parsed.resultUrls?.[0]) {
          videoUrl = parsed.resultUrls[0]
          break
        }
      }
    }
  }

  if (!videoUrl) {
    throw new Error('KIE.AI fallback timeout')
  }

  console.log(`🎉 Fallback successful via KIE.AI!`)
  console.log(`⚠️ Note: Video may have watermark (remove_watermark=${removeWatermark})`)

  return res.status(200).json({
    success: true,
    videoUrl: videoUrl,
    duration: duration,
    resolution: resolution,
    aspectRatio: aspectRatio,
    mode: image ? 'image-to-video' : 'text-to-video',
    model: model,
    message: removeWatermark
      ? '✨ Video generated via KIE.AI (Fallback) - No watermark'
      : '⚠️ Video generated via KIE.AI (Fallback) - May have watermark',
    provider: 'KIE.AI (Fallback from CometAPI)',
    wasFallback: true,
    hasWatermark: !removeWatermark
  })
}
