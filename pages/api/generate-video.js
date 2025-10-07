export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
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

    console.log(`🎬 Starting Sora video generation via CometAPI...`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Resolution: ${resolution}, Aspect: ${aspectRatio}`)

    // Map resolution and aspect ratio to width/height
    const resolutionMap = {
      '480p': { height: 480 },
      '720p': { height: 720 },
      '1080p': { height: 1080 }
    }

    const aspectRatioMap = {
      '16:9': { width: 16, height: 9 },
      '9:16': { width: 9, height: 16 },
      '1:1': { width: 1, height: 1 },
      '4:3': { width: 4, height: 3 },
      '3:4': { width: 3, height: 4 },
      '21:9': { width: 21, height: 9 }
    }

    const resInfo = resolutionMap[resolution] || { height: 720 }
    const aspectInfo = aspectRatioMap[aspectRatio] || { width: 16, height: 9 }

    // Calculate width based on aspect ratio and height
    const videoHeight = resInfo.height
    const videoWidth = Math.round((videoHeight * aspectInfo.width) / aspectInfo.height)

    // Calculate n_frames (30 fps assumed)
    const nFrames = duration * 30

    console.log(`📐 Video dimensions: ${videoWidth}x${videoHeight}, Frames: ${nFrames}`)

    // Build prompt
    let fullPrompt = prompt || 'Create a cinematic video'

    // Prepare inpaint_items for image-to-video
    const inpaintItems = image ? [{ url: image }] : []

    // Create request using CometAPI Sora format (from OpenAPI spec)
    const requestPayload = {
      type: 'video_gen',
      prompt: fullPrompt,
      n_variants: 1,
      n_frames: nFrames,
      height: videoHeight,
      width: videoWidth,
      style: 'natural',
      inpaint_items: inpaintItems,
      operation: 'simple_compose'
    }

    console.log('🚀 Sending request to CometAPI Sora endpoint...')
    console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2))

    // Call CometAPI Sora endpoint (from OpenAPI spec)
    const createResponse = await fetch('https://api.cometapi.com/sora/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cometApiKey}`,
        'Content-Type': 'application/json'
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

    const responseData = await createResponse.json()
    console.log('✅ CometAPI Response received')
    console.log('📦 Full Response:', JSON.stringify(responseData, null, 2))

    // Response format: { code: "success", message: "", data: "task_01jryr7zqnecna1nepv0whpfhg" }
    if (responseData.code !== 'success') {
      throw new Error(responseData.message || 'Failed to create video generation task')
    }

    const taskId = responseData.data
    console.log(`✅ Task created: ${taskId}`)

    // Poll for task completion (max 5 minutes)
    console.log('⏳ Polling for task completion...')
    const maxAttempts = 60 // 5 minutes (5 seconds interval)
    let videoUrl = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Wait 5 seconds before checking
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log(`🔍 Checking task status (attempt ${attempt + 1}/${maxAttempts})...`)

      // Query task status (assuming endpoint exists)
      const statusResponse = await fetch(`https://api.cometapi.com/sora/v1/videos/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cometApiKey}`
        }
      })

      if (!statusResponse.ok) {
        console.error(`⚠️ Status check failed: ${statusResponse.status}`)
        continue
      }

      const statusData = await statusResponse.json()
      console.log('📊 Status:', JSON.stringify(statusData, null, 2))

      // Check if completed and extract video URL
      if (statusData.code === 'success' && statusData.data) {
        if (statusData.data.status === 'completed' || statusData.data.url) {
          videoUrl = statusData.data.url || statusData.data.video_url
          console.log(`✅ Video ready: ${videoUrl}`)
          break
        } else if (statusData.data.status === 'failed') {
          throw new Error('Video generation failed')
        }
      }
    }

    if (!videoUrl) {
      throw new Error('Video generation timeout - please try again')
    }

    // Return video URL
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      duration: duration,
      resolution: resolution,
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      message: '✨ Video generated successfully with Sora via CometAPI!',
      provider: 'CometAPI',
      taskId: taskId
    })

  } catch (error) {
    console.error('❌ Video generation error:', error)

    // Check if it's an API availability issue
    const isApiNotAvailable = error.message.includes('Sora API is not available') ||
                               error.message.includes('not valid JSON') ||
                               error.message.includes('Unexpected token')

    res.status(500).json({
      error: error.message || 'Failed to generate video',
      details: error.toString(),
      suggestion: isApiNotAvailable
        ? '⚠️ Sora API ยังไม่เปิดให้ใช้งานทั่วไป - กรุณาตรวจสอบสถานะที่ https://platform.openai.com/docs หรือรอ OpenAI เปิดให้ใช้งาน'
        : 'ตรวจสอบ OpenAI API key และสิทธิ์การเข้าถึง Sora API',
      apiStatus: isApiNotAvailable ? 'not_available' : 'unknown_error'
    })
  }
}
