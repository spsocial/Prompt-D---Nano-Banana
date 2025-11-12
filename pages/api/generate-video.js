import { safeStringify } from '../../lib/logUtils';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  maxDuration: 2700, // 45 minutes timeout for video generation (to support 40 min AsyncData.net polling + watermark removal)
}

// Helper function to poll AsyncData.net for actual video URL
async function pollAsyncDataForVideo(taskId, maxAttempts = 480) {
  console.log(`🔍 Polling AsyncData.net for task: ${taskId} (max ${maxAttempts * 5 / 60} minutes)`)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait 5 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log(`📡 Poll attempt ${attempt}/${maxAttempts} for ${taskId}`)

      // Fetch the API endpoint
      const apiUrl = `https://asyncdata.net/api/share/${taskId}`
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      })

      if (!response.ok) {
        console.log(`⚠️ API returned ${response.status}, retrying...`)
        continue
      }

      const data = await response.json()

      // Log full response on first few attempts for debugging
      if (attempt <= 3) {
        console.log(`📄 Full API response (attempt ${attempt}):`, JSON.stringify(data).substring(0, 500))
      }

      // Log status (AsyncData.net uses 'status', not 'state')
      const status = data.status || data.content?.status
      const progress = data.progress || 0
      const isCompleted = data.is_completed || data.completed

      console.log(`📊 Status: ${status}, Progress: ${progress}%, Completed: ${isCompleted}`)

      // IMPORTANT: Try to extract video URL even if not marked as completed yet
      // Sometimes the MP4 URL is available before status changes to "completed"
      const videoUrl = data.url ||  // Top level url (filesystem.site MP4)
                      data.content?.draft_info?.downloadable_url ||  // Draft downloadable URL (Sora2)
                      data.content?.url ||  // Content.url (OpenAI CDN)
                      data.content?.downloadable_url ||  // Downloadable URL
                      data.content?.encodings?.source?.path ||  // Source encoding path
                      data.content?.encodings?.source_wm?.path ||  // Source with watermark
                      data.videoUrl ||
                      data.video_url ||
                      data.result?.url ||
                      data.output?.url

      // Check if we have a valid MP4 URL
      if (videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('filesystem.site'))) {
        console.log(`🔍 Found video URL in response!`)
        console.log(`  - URL: ${videoUrl.substring(0, 100)}...`)
        console.log(`✅ Video ready! Returning URL even if status is: ${status}`)
        return videoUrl
      }

      // Check if completed
      if (status === 'completed' || status === 'success' || isCompleted === true) {
        console.log(`🔍 Task marked as completed, but no video URL found`)
        console.log(`  - data.url: ${data.url?.substring(0, 80)}...`)
        console.log(`  - data.content?.draft_info?.downloadable_url: ${data.content?.draft_info?.downloadable_url?.substring(0, 80)}...`)
        console.log(`  - data.content?.url: ${data.content?.url?.substring(0, 80)}...`)
        console.log(`  - data.content?.downloadable_url: ${data.content?.downloadable_url?.substring(0, 80)}...`)
        console.log('⚠️ Task completed but no video URL found')
        console.log('📄 Full response:', JSON.stringify(data).substring(0, 1000))
      } else if (status === 'failed' || status === 'error') {
        const errorMsg = data.error || data.error_message || 'Unknown error'
        console.error(`❌ AsyncData.net task failed: ${errorMsg}`)
        return null
      } else {
        // Still processing
        console.log(`⏳ Still processing... (${progress}% complete)`)
      }

      // Continue polling if still processing
    } catch (error) {
      console.error(`⚠️ Poll error (attempt ${attempt}):`, error.message)
      // Continue polling despite errors
    }
  }

  console.log('⏱️ Polling timeout - video may still be processing')
  return null
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
      aspectRatio = '16:9',
      allowWatermark = false, // New parameter: false = no watermark (default), true = allow watermark (cheaper)
      model = 'sora-2'
    } = req.body

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' })
    }

    // NEW LOGIC: If user allows watermark, use backup API directly (cheaper, has watermark)
    if (allowWatermark && process.env.KIE_API_KEY) {
      console.log('💧 User allows watermark → Using backup API directly (cheaper option)')
      try {
        return await useKieAIDirect(req, res)
      } catch (kieError) {
        console.error('❌ Backup API direct failed:', kieError)
        console.log('🔄 Falling back to primary API...')
        // Continue with primary API as fallback
      }
    }

    // Use primary API key from environment variable only (no hardcoded key)
    const cometApiKey = apiKey || process.env.COMET_API_KEY

    if (!cometApiKey) {
      return res.status(400).json({
        error: 'API key is required',
        message: 'กรุณาตั้งค่า API key ใน Railway environment variables',
        suggestion: '🔑 ไม่พบ API Key - กรุณาติดต่อผู้ดูแลระบบ'
      })
    }

    console.log(`🎬 Starting Sora-2 video generation...`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Resolution: ${resolution}, Aspect: ${aspectRatio}`)

    // Use model name: sora-2 or sora-2-hd
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
      // Image-to-Video: Officially supported with multimodal format + max_tokens
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
      max_tokens: 3000, // Required for Sora 2 (especially for image-to-video)
      size: size, // IMPORTANT: Specify video dimensions (WIDTHxHEIGHT format)
      seconds: String(duration), // Duration in seconds (must be string: '4', '8', '12')
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ]
    }

    console.log('🚀 Sending request with streaming...')
    console.log('📦 Request payload:', safeStringify(requestPayload))

    // Call API using OpenAI-compatible endpoint
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
      console.error('❌ API Error Response:', errorText)
      console.error('❌ Status Code:', createResponse.status)

      let errorMessage = 'Failed to generate video'
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
        // NEW: AsyncData.net URLs (API's new format) - match first!
        /https?:\/\/asyncdata\.net\/(?:web|source)\/task_[a-zA-Z0-9]+/,  // https://asyncdata.net/web/task_XXXXX
        /!\[([^\]]*)\]\((https?:\/\/asyncdata\.net\/(?:web|source)\/task_[a-zA-Z0-9]+)\)/,  // ![text](asyncdata url)
        /\[([^\]]*)\]\((https?:\/\/asyncdata\.net\/(?:web|source)\/task_[a-zA-Z0-9]+)\)/,  // [text](asyncdata url)
        // Classic mp4 URLs
        /!\[([^\]]*)\]\((https?:\/\/[^\)]+\.mp4[^\)]*)\)/,  // ![text](url) with query params
        /!\[(https?:\/\/[^\]]+\.mp4[^\]]*)\]/,               // ![url] with query params
        /\[Play online[^\]]*\]\((https?:\/\/[^\)]+\.mp4[^\)]*)\)/i,  // [Play online▶️](url)
        /https?:\/\/[^\s\)\]"'<>]+\.mp4[^\s\)\]"'<>]*/      // Plain URL with query params
      ]

      for (const pattern of urlPatterns) {
        const match = content.match(pattern)
        if (match) {
          // Extract URL from different capture groups
          const url = match[2] || match[1] || match[0]
          if (url && url.startsWith('http')) {
            // Clean up any trailing markdown characters
            const cleanUrl = url.replace(/[\]\)]+$/, '').trim()
            console.log(`🔍 Pattern matched: ${pattern.source.substring(0, 50)}...`)
            console.log(`✅ Extracted URL: ${cleanUrl}`)
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

      // Log full content for debugging (truncate if too long)
      if (accumulatedContent.length <= 2000) {
        console.log('📄 Full content:', accumulatedContent)
      } else {
        console.log('📄 First 1000 chars:', accumulatedContent.substring(0, 1000))
        console.log('📄 Last 1000 chars:', accumulatedContent.substring(accumulatedContent.length - 1000))
      }

      // Use the same helper function
      const foundUrl = searchForUrl(accumulatedContent)
      if (foundUrl) {
        finalUrl = foundUrl
        console.log(`✅ Found URL in final content search: ${finalUrl}`)
      } else {
        console.log('❌ No URL pattern matched in accumulated content')
      }
    }

    // Use final URL if available, otherwise preview
    let videoUrl = finalUrl || previewUrl
    let asyncDataUrl = null // Store AsyncData.net URL for user to check directly

    // NEW: If we got an AsyncData.net URL, we need to poll for the actual video
    if (videoUrl && videoUrl.includes('asyncdata.net/web/task_')) {
      console.log('🔄 AsyncData.net URL detected, polling for actual video...')

      // Save the AsyncData.net URL so users can check it directly
      asyncDataUrl = videoUrl
      console.log(`📋 Saved AsyncData.net URL for user: ${asyncDataUrl}`)

      try {
        // Extract task ID from URL
        const taskIdMatch = videoUrl.match(/task_([a-zA-Z0-9]+)/)
        if (taskIdMatch) {
          const asyncTaskId = taskIdMatch[0] // task_XXXXX
          console.log(`📋 Async Task ID: ${asyncTaskId}`)

          // Poll AsyncData.net API for the actual video URL
          const actualVideoUrl = await pollAsyncDataForVideo(asyncTaskId)
          if (actualVideoUrl) {
            videoUrl = actualVideoUrl
            console.log(`✅ Got actual video URL: ${actualVideoUrl}`)
          } else {
            console.log('⚠️ Polling timeout, keeping AsyncData.net URL for user to check')
          }
        }
      } catch (pollError) {
        console.error('⚠️ Error polling AsyncData.net:', pollError.message)
        // Continue with preview URL if polling fails
      }
    }

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
    if (asyncDataUrl) {
      console.log(`🔗 AsyncData.net URL: ${asyncDataUrl}`)
    }

    // Return video URL
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      previewUrl: previewUrl,
      finalUrl: finalUrl,
      asyncDataUrl: asyncDataUrl, // Add AsyncData.net URL for user to check directly
      taskId: taskId,
      duration: duration,
      resolution: resolution,
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      model: modelName,
      message: '✨ วิดีโอสร้างเสร็จแล้ว',
      hasWatermark: false,
      wasFallback: false
    })

  } catch (error) {
    console.error('❌ Video generation error:', error)

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
                               error.message.includes('Unexpected token') ||
                               error.message.includes('No available capacity') ||
                               error.message.includes('no available channel') ||
                               error.message.includes('model_not_found')

    // Check for quota/credit errors
    const isQuotaError = error.message.includes('quota') ||
                        error.message.includes('insufficient') ||
                        error.message.includes('not enough')

    // Try fallback to backup API if enabled and it's a system error or quota issue
    const shouldTryFallback = (isSystemError || isApiNotAvailable || isQuotaError) &&
                             process.env.KIE_API_KEY

    if (shouldTryFallback) {
      console.log('🔄 Primary API failed, attempting fallback to backup API...')

      try {
        return await fallbackToKieAI(req, res)
      } catch (fallbackError) {
        console.error('❌ Backup API fallback also failed:', fallbackError)
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
        ? '🔧 ระบบกำลังมีปัญหา (network fluctuations หรือ high load) - เครดิตจะถูกคืนอัตโนมัติ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
        : isTimeout
        ? '⏱️ การสร้างวิดีโอใช้เวลานาน (1-3 นาที) แต่เกิด timeout - เครดิตจะถูกคืนอัตโนมัติ กรุณาลองใหม่อีกครั้ง'
        : isApiNotAvailable
        ? '⚠️ เซิร์ฟเวอร์ไม่พร้อมให้บริการชั่วคราว - เครดิตจะถูกคืนอัตโนมัติ กรุณาลองใหม่อีกครั้ง'
        : isQuotaError
        ? '💳 เครดิต API ไม่เพียงพอ - กรุณาลองใหม่อีกครั้งในภายหลัง'
        : 'เกิดข้อผิดพลาด - เครดิตจะถูกคืนอัตโนมัติ',
      apiStatus: isSystemError ? 'system_error' : isTimeout ? 'timeout' : isApiNotAvailable ? 'not_available' : isQuotaError ? 'quota_error' : 'unknown_error',
      shouldRefund: true // Always refund on error
    })
  }
}

// Direct use of backup API when user allows watermark (cheaper option)
async function useKieAIDirect(req, res) {
  console.log('💧 Using backup API directly (user allows watermark)...')

  const {
    prompt,
    image,
    duration = 10,
    resolution = '720p',
    aspectRatio = '16:9',
    model = 'sora-2'
  } = req.body

  const kieApiKey = process.env.KIE_API_KEY

  if (!kieApiKey) {
    throw new Error('Backup API key not configured')
  }

  console.log(`🎬 Starting video generation via backup API (with watermark, cheaper)...`)

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
      remove_watermark: false // Allow watermark for cheaper price
    }
  }

  // Image not supported as base64 in backup API
  if (image && image.startsWith('data:')) {
    throw new Error('Backup API requires image URLs, not base64')
  }

  if (image) {
    requestBody.input.image_urls = [image]
  }

  console.log('🚀 Creating task on backup API...')

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
    throw new Error(`Backup API createTask failed: ${errorText}`)
  }

  const createData = await createResponse.json()
  const taskId = createData.data?.taskId

  if (!taskId) {
    throw new Error('No taskId from backup API')
  }

  console.log(`✅ Task created on backup API: ${taskId}`)

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
    } else if (state === 'failed' || state === 'error') {
      throw new Error('Backup API task failed')
    }
  }

  if (!videoUrl) {
    throw new Error('Backup API timeout')
  }

  console.log(`🎉 Backup API video generation complete (with watermark)!`)

  return res.status(200).json({
    success: true,
    videoUrl: videoUrl,
    duration: duration,
    resolution: resolution,
    aspectRatio: aspectRatio,
    mode: image ? 'image-to-video' : 'text-to-video',
    model: model,
    message: '✨ วิดีโอสร้างเสร็จแล้ว',
    hasWatermark: true,
    wasFallback: false
  })
}

// Fallback function to use backup API when primary API fails (no watermark version)
async function fallbackToKieAI(req, res) {
  console.log('🔄 Executing backup API fallback (no watermark)...')

  const {
    prompt,
    image,
    duration = 10,
    resolution = '720p',
    aspectRatio = '16:9',
    model = 'sora-2'
  } = req.body

  const kieApiKey = process.env.KIE_API_KEY

  if (!kieApiKey) {
    throw new Error('Backup API key not configured for fallback')
  }

  console.log(`🎬 Fallback: Starting video generation via backup API...`)

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
      remove_watermark: true // No watermark for fallback (user didn't request watermark)
    }
  }

  // Image not supported as base64 in backup API - skip fallback for image mode
  if (image && image.startsWith('data:')) {
    throw new Error('Backup API requires image URLs, not base64 - cannot fallback for image-to-video')
  }

  if (image) {
    requestBody.input.image_urls = [image]
  }

  console.log('🚀 Fallback: Creating task on backup API...')

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
    throw new Error(`Backup API createTask failed: ${errorText}`)
  }

  const createData = await createResponse.json()
  const taskId = createData.data?.taskId

  if (!taskId) {
    throw new Error('No taskId from backup API')
  }

  console.log(`✅ Fallback: Task created on backup API: ${taskId}`)

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
    throw new Error('Backup API fallback timeout')
  }

  console.log(`🎉 Fallback successful (no watermark)!`)

  return res.status(200).json({
    success: true,
    videoUrl: videoUrl,
    duration: duration,
    resolution: resolution,
    aspectRatio: aspectRatio,
    mode: image ? 'image-to-video' : 'text-to-video',
    model: model,
    message: '✨ วิดีโอสร้างเสร็จแล้ว',
    wasFallback: true,
    hasWatermark: false // No watermark in fallback
  })
}
