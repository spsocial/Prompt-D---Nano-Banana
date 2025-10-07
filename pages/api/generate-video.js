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

    // Try OpenAI-compatible format with sora-2 model
    const requestPayload = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.7
    }

    console.log('🚀 Sending request to CometAPI...')
    console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2))

    // Call CometAPI using OpenAI-compatible endpoint
    const createResponse = await fetch('https://api.cometapi.com/v1/chat/completions', {
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

    // Extract video URL from response
    let videoUrl = null

    // Try different response formats
    if (responseData.choices && responseData.choices[0]) {
      const content = responseData.choices[0].message?.content

      if (content) {
        // Extract URL from content (could be plain URL or markdown format)
        const urlMatch = content.match(/https?:\/\/[^\s\)\]]+/)
        if (urlMatch) {
          videoUrl = urlMatch[0]
          console.log(`✅ Video URL extracted from content: ${videoUrl}`)
        } else if (content.startsWith('http')) {
          // Content itself might be the URL
          videoUrl = content.trim()
          console.log(`✅ Video URL from content: ${videoUrl}`)
        }
      }
    }

    // Try alternative response formats
    if (!videoUrl && responseData.data) {
      if (typeof responseData.data === 'string' && responseData.data.startsWith('http')) {
        videoUrl = responseData.data
        console.log(`✅ Video URL from data field: ${videoUrl}`)
      } else if (responseData.data.url) {
        videoUrl = responseData.data.url
        console.log(`✅ Video URL from data.url: ${videoUrl}`)
      }
    }

    if (!videoUrl) {
      console.error('❌ Could not extract video URL from response')
      console.error('Response structure:', JSON.stringify(responseData, null, 2))
      throw new Error('No video URL found in response. Please check logs.')
    }

    // Return video URL
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      duration: duration,
      resolution: resolution,
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      model: modelName,
      message: '✨ Video generated successfully with Sora-2!',
      provider: 'CometAPI'
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
