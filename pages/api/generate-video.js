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

    // Use CometAPI key (new approach)
    const cometApiKey = apiKey || process.env.COMET_API_KEY || 'sk-UXGWQInXgWPRGoCZ6FJdsV3JCXAw8OrNkCAc5rquiViqx2oL'

    if (!cometApiKey) {
      return res.status(400).json({
        error: 'CometAPI key is required',
        message: 'Please provide a CometAPI key to use Sora video generation'
      })
    }

    console.log(`🎬 Starting Sora-2 video generation via CometAPI...`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Resolution: ${resolution}, Aspect: ${aspectRatio}`)

    // Use model name from CometAPI: sora-2 or sora-2-hd
    const modelName = resolution === '1080p' ? 'sora-2-hd' : 'sora-2'

    console.log(`🎯 Using model: ${modelName}`)

    // Build prompt with specifications
    let fullPrompt = prompt || 'Create a cinematic video'

    // Add video specifications to prompt
    fullPrompt = `${fullPrompt}. Create a ${duration} second video in ${resolution} resolution with ${aspectRatio} aspect ratio.`

    if (image) {
      fullPrompt = `Based on this image, create a dynamic video: ${fullPrompt}. Add smooth camera movements and cinematic effects.`
    }

    // Use streaming to avoid timeout (same as veo3)
    const requestPayload = {
      model: modelName,
      stream: true, // IMPORTANT: Use streaming to avoid timeout!
      messages: [
        {
          role: 'user',
          content: fullPrompt
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

    // Check if it's an API availability issue
    const isApiNotAvailable = error.message.includes('Sora API is not available') ||
                               error.message.includes('not valid JSON') ||
                               error.message.includes('Unexpected token')

    // Check for timeout errors
    const isTimeout = error.message.includes('504') ||
                     error.message.includes('Gateway Timeout') ||
                     error.message.includes('timed out')

    res.status(500).json({
      error: error.message || 'Failed to generate video',
      details: error.toString(),
      suggestion: isTimeout
        ? '⏱️ การสร้างวิดีโอใช้เวลานาน (1-3 นาที) แต่ API timeout ก่อน กรุณาติดต่อ CometAPI Support: https://discord.gg/HMpuV6FCrG หรือลองใหม่อีกครั้ง'
        : isApiNotAvailable
        ? '⚠️ Sora API ยังไม่เปิดให้ใช้งานทั่วไป - กรุณาตรวจสอบสถานะที่ https://platform.openai.com/docs หรือรอ OpenAI เปิดให้ใช้งาน'
        : 'ตรวจสอบ API key และสิทธิ์การเข้าถึง Sora API',
      apiStatus: isTimeout ? 'timeout' : isApiNotAvailable ? 'not_available' : 'unknown_error'
    })
  }
}
