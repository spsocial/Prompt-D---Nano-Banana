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

    // Build model name with parameters (CometAPI format)
    // Format: sora-2-{aspectRatio}-{resolution}-{duration}s
    // Example: sora-2-16:9-720p-10s (landscape, 720p, 10 seconds)
    const baseModel = resolution === '1080p' ? 'sora-2-hd' : 'sora-2'
    const modelName = `${baseModel}-${aspectRatio}-${resolution}-${duration}s`

    console.log(`🎯 Using model: ${modelName} (with aspect ratio, resolution, duration)`)

    // Use clean prompt (Sora 2 doesn't support technical specs in prompt)
    const cleanPrompt = prompt || 'Create a cinematic video'

    // Prepare message content
    let messageContent

    if (image) {
      // Image-to-Video: NOT officially supported by Sora 2, but try multimodal format
      console.log('⚠️ Image-to-Video mode: Sora 2 may not support this (trying anyway)')
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
      // Text-to-Video: simple string content (official format)
      messageContent = cleanPrompt
    }

    // Use streaming to avoid timeout (same as veo3)
    const requestPayload = {
      model: modelName,
      stream: true, // IMPORTANT: Use streaming to avoid timeout!
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ]
    }

    console.log('🚀 Sending request to CometAPI with streaming...')
    console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2))

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
    console.error('❌ Video generation error:', error)

    // Check if it's an API system error (should refund credits automatically)
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
        : 'เกิดข้อผิดพลาด - เครดิตจะถูกคืนอัตโนมัติ',
      apiStatus: isSystemError ? 'system_error' : isTimeout ? 'timeout' : isApiNotAvailable ? 'not_available' : 'unknown_error',
      shouldRefund: true // Always refund on error
    })
  }
}
