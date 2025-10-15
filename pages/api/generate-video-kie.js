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
      duration = 10,
      aspectRatio = '16:9',
      model = 'sora-2',
      removeWatermark = false,
      useFallback = true // Enable fallback to CometAPI by default
    } = req.body

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' })
    }

    // Get KIE.AI API key from environment
    const kieApiKey = process.env.KIE_API_KEY

    if (!kieApiKey) {
      console.log('⚠️ KIE.AI API Key not found')
      if (useFallback) {
        console.log('🔄 Falling back to CometAPI...')
        return fallbackToCometAPI(req, res)
      }
      return res.status(400).json({
        error: 'KIE.AI API key is required',
        message: 'กรุณาตั้งค่า KIE_API_KEY ใน Railway environment variables'
      })
    }

    console.log(`🎬 Starting video generation via KIE.AI...`)
    console.log(`📝 Model: ${model}`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Aspect: ${aspectRatio}`)
    console.log(`🚫 Remove Watermark: ${removeWatermark}`)

    // Determine model name based on input
    let modelName
    if (image) {
      // Image-to-video models
      modelName = model.includes('pro') ? 'sora-2-pro-image-to-video' : 'sora-2-image-to-video'
    } else {
      // Text-to-video models
      modelName = model.includes('pro') ? 'sora-2-pro-text-to-video' : 'sora-2-text-to-video'
    }

    console.log(`🎯 Using KIE.AI model: ${modelName}`)

    // Map aspect ratio to KIE.AI format
    const kieAspectRatio = aspectRatio === '16:9' ? 'landscape' : 'portrait'

    // Prepare request body
    const requestBody = {
      model: modelName,
      input: {
        prompt: prompt || 'Create a cinematic video',
        aspect_ratio: kieAspectRatio,
        remove_watermark: removeWatermark
      }
    }

    // Add image if provided
    if (image) {
      // Convert base64 to URL if needed (KIE.AI requires URL)
      if (image.startsWith('data:')) {
        // For now, we'll need to upload to a temporary storage
        // This is a limitation - KIE.AI requires URLs, not base64
        console.log('⚠️ KIE.AI requires image URL, not base64')
        if (useFallback) {
          console.log('🔄 Falling back to CometAPI for base64 images...')
          return fallbackToCometAPI(req, res)
        }
        return res.status(400).json({
          error: 'KIE.AI requires image URLs, not base64',
          suggestion: 'กรุณาใช้ CometAPI สำหรับการอัพโหลดภาพจากเครื่อง'
        })
      }
      requestBody.input.image_urls = [image]
    }

    // Add Pro model specific parameters
    if (model.includes('pro')) {
      requestBody.input.n_frames = String(duration) // "10" or "15"
      requestBody.input.size = model.includes('1080p') ? 'high' : 'standard'
    }

    console.log('🚀 Creating task on KIE.AI...')
    console.log('📦 Request payload:', safeStringify(requestBody))

    // Step 1: Create Task
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
      console.error('❌ KIE.AI Error Response:', errorText)
      console.error('❌ Status Code:', createResponse.status)

      // Try to parse error
      let errorMessage = 'Failed to create task on KIE.AI'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch (e) {
        errorMessage = errorText.substring(0, 200)
      }

      // Fallback to CometAPI on error
      if (useFallback) {
        console.log('🔄 KIE.AI failed, falling back to CometAPI...')
        return fallbackToCometAPI(req, res)
      }

      throw new Error(errorMessage)
    }

    const createData = await createResponse.json()

    // DEBUG: Log full response to see structure
    console.log('📄 KIE.AI Create Response:', safeStringify(createData))

    // Try multiple possible field names for taskId
    const taskId = createData.taskId ||
                   createData.task_id ||
                   createData.id ||
                   createData.data?.taskId ||
                   createData.data?.task_id ||
                   createData.data?.id ||
                   createData.result?.taskId ||
                   createData.result?.task_id ||
                   createData.result?.id

    if (!taskId) {
      console.error('❌ No task ID received from KIE.AI')
      console.error('📄 Full response:', safeStringify(createData))
      if (useFallback) {
        console.log('🔄 No task ID, falling back to CometAPI...')
        return fallbackToCometAPI(req, res)
      }
      throw new Error('No task ID received from KIE.AI')
    }

    console.log(`✅ Task created: ${taskId}`)

    // Step 2: Poll for results
    const maxAttempts = 60 // Max 5 minutes (60 * 5 seconds)
    let attempts = 0
    let videoUrl = null

    console.log('⏳ Polling for task completion...')

    while (attempts < maxAttempts) {
      attempts++

      // Wait 5 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log(`🔍 Polling attempt ${attempts}/${maxAttempts}...`)

      const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${kieApiKey}`
        }
      })

      if (!statusResponse.ok) {
        console.error('⚠️ Failed to check status, retrying...')
        continue
      }

      const statusData = await statusResponse.json()

      // DEBUG: Log first polling response to see structure
      if (attempts === 1) {
        console.log('📄 First Polling Response:', safeStringify(statusData))
      }

      // Try multiple possible field names for state
      const state = statusData.state ||
                    statusData.status ||
                    statusData.data?.state ||
                    statusData.data?.status ||
                    statusData.result?.state ||
                    statusData.result?.status

      console.log(`📊 Task state: ${state}`)

      // DEBUG: Log full status response every 10 attempts
      if (attempts % 10 === 0) {
        console.log('📄 Status Response:', safeStringify(statusData))
      }

      if (state === 'completed' || state === 'success' || state === 'SUCCESS' || state === '3') {
        // Extract video URL from result
        const resultJson = statusData.resultJson ||
                          statusData.result ||
                          statusData.output ||
                          statusData.data?.resultJson ||
                          statusData.data?.result

        if (resultJson) {
          if (typeof resultJson === 'string') {
            try {
              const parsed = JSON.parse(resultJson)
              videoUrl = parsed.video_url || parsed.videoUrl || parsed.url || parsed.videoSrc
            } catch (e) {
              videoUrl = resultJson
            }
          } else {
            videoUrl = resultJson.video_url ||
                      resultJson.videoUrl ||
                      resultJson.url ||
                      resultJson.videoSrc
          }
        }

        // Also check direct fields
        if (!videoUrl) {
          videoUrl = statusData.video_url ||
                    statusData.videoUrl ||
                    statusData.url ||
                    statusData.data?.videoUrl ||
                    statusData.data?.video_url
        }

        if (videoUrl) {
          console.log(`✅ Video ready: ${videoUrl}`)
          break
        } else {
          console.error('❌ Task completed but no video URL found')
          console.log('📄 Status data:', safeStringify(statusData))
          throw new Error('Task completed but no video URL found')
        }
      } else if (state === 'failed' || state === 'error' || state === 'FAILED' || state === 'ERROR') {
        const errorMsg = statusData.error || statusData.errorMessage || 'Task failed'
        console.error(`❌ Task failed: ${errorMsg}`)

        if (useFallback) {
          console.log('🔄 Task failed, falling back to CometAPI...')
          return fallbackToCometAPI(req, res)
        }

        throw new Error(errorMsg)
      } else if (state === 'processing' || state === 'pending' || state === 'PROCESSING' || state === 'PENDING') {
        // Continue polling
        console.log('⏳ Task still processing...')
      } else {
        console.log(`⚠️ Unknown state: ${state}`)
      }
    }

    if (!videoUrl) {
      console.error('❌ Timeout: Video not ready after 5 minutes')
      if (useFallback) {
        console.log('🔄 Timeout, falling back to CometAPI...')
        return fallbackToCometAPI(req, res)
      }
      throw new Error('Timeout: Video generation took too long (>5 minutes)')
    }

    console.log(`🎉 KIE.AI video generation complete!`)
    console.log(`📹 Video URL: ${videoUrl}`)

    // Return success response
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      taskId: taskId,
      duration: duration,
      resolution: model.includes('1080p') ? '1080p' : '720p',
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      model: modelName,
      message: '✨ Video generated successfully with KIE.AI!',
      provider: 'KIE.AI',
      watermarkRemoved: removeWatermark
    })

  } catch (error) {
    console.error('❌ KIE.AI video generation error:', error)

    res.status(500).json({
      error: error.message || 'Failed to generate video',
      details: error.toString(),
      suggestion: '⚠️ เกิดข้อผิดพลาดในการสร้างวิดีโอผ่าน KIE.AI - เครดิตจะถูกคืนอัตโนมัติ',
      shouldRefund: true
    })
  }
}

// Fallback function to use CometAPI
async function fallbackToCometAPI(req, res) {
  console.log('🔄 Executing fallback to CometAPI...')

  const {
    prompt,
    image,
    duration = 10,
    resolution = '720p',
    aspectRatio = '16:9',
    model
  } = req.body

  // Use CometAPI key
  const cometApiKey = process.env.COMET_API_KEY

  if (!cometApiKey) {
    return res.status(400).json({
      error: 'No API keys available',
      message: 'Both KIE.AI and CometAPI keys are missing'
    })
  }

  console.log(`🎬 Fallback: Starting Sora-2 via CometAPI...`)

  // Determine CometAPI model
  const cometModel = resolution === '1080p' ? 'sora-2-hd' : 'sora-2'

  // Map aspect ratio to size
  let size
  if (aspectRatio === '16:9') {
    size = resolution === '1080p' ? '1792x1024' : '1280x720'
  } else if (aspectRatio === '9:16') {
    size = resolution === '1080p' ? '1024x1792' : '720x1280'
  } else {
    size = '1280x720'
  }

  const cleanPrompt = (prompt || 'Create a cinematic video')

  let messageContent
  if (image) {
    messageContent = [
      { type: 'text', text: cleanPrompt },
      { type: 'image_url', image_url: { url: image } }
    ]
  } else {
    messageContent = cleanPrompt
  }

  const requestPayload = {
    model: cometModel,
    stream: true,
    max_tokens: 3000,
    size: size,
    seconds: String(duration),
    messages: [{ role: 'user', content: messageContent }]
  }

  console.log('🚀 Fallback: Sending request to CometAPI...')

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
    throw new Error(`CometAPI fallback failed: ${errorText.substring(0, 200)}`)
  }

  // Read streaming response (simplified version)
  const reader = createResponse.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalUrl = null
  let accumulatedContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim() || line.startsWith('data: [DONE]')) continue

      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.substring(6)
          const data = JSON.parse(jsonStr)
          if (data.choices?.[0]?.delta?.content) {
            accumulatedContent += data.choices[0].delta.content
          }
        } catch (e) {}
      }

      // Extract URL
      const urlMatch = line.match(/https?:\/\/[^\s\)\]]+\.mp4[^\s\)\]]*/)
      if (urlMatch) {
        finalUrl = urlMatch[0]
        console.log(`✅ Fallback URL found: ${finalUrl}`)
        break
      }
    }

    if (finalUrl) break
  }

  if (!finalUrl && accumulatedContent) {
    const urlMatch = accumulatedContent.match(/https?:\/\/[^\s\)\]]+\.mp4[^\s\)\]]*/)
    if (urlMatch) {
      finalUrl = urlMatch[0]
    }
  }

  if (!finalUrl) {
    throw new Error('Fallback: No video URL found from CometAPI')
  }

  console.log(`🎉 Fallback successful via CometAPI!`)

  return res.status(200).json({
    success: true,
    videoUrl: finalUrl,
    duration: duration,
    resolution: resolution,
    aspectRatio: aspectRatio,
    mode: image ? 'image-to-video' : 'text-to-video',
    model: cometModel,
    message: '✨ Video generated via CometAPI (Fallback)',
    provider: 'CometAPI (Fallback)',
    wasFallback: true
  })
}
