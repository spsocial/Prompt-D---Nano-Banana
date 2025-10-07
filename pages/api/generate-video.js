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

    // CometAPI uses model: sora-1.0-turbo or Sora
    const modelName = 'sora-1.0-turbo'

    console.log(`🎯 Using model: ${modelName}`)

    // Build prompt with specifications
    let fullPrompt = prompt || 'Create a cinematic video'

    // Add specifications to prompt
    fullPrompt = `${fullPrompt}. Video specifications: ${duration} seconds duration, ${resolution} resolution, ${aspectRatio} aspect ratio.`

    if (image) {
      fullPrompt = `Create a dynamic video with smooth camera movements and cinematic effects. ${fullPrompt}`
    }

    // Create request using CometAPI format (OpenAI-compatible)
    const requestPayload = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      max_tokens: 2048
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

    // Extract video URL from CometAPI response
    // Format: response.choices[0].message.content contains video URL
    let videoUrl = null

    if (responseData.choices && responseData.choices[0]) {
      const content = responseData.choices[0].message?.content

      if (content) {
        // Extract URL from content (could be plain URL or markdown format)
        const urlMatch = content.match(/https?:\/\/[^\s\)]+/)
        if (urlMatch) {
          videoUrl = urlMatch[0]
          console.log(`✅ Video URL extracted: ${videoUrl}`)
        } else {
          // If no URL found, the content itself might be the URL
          videoUrl = content.trim()
        }
      }
    }

    if (!videoUrl) {
      console.error('Response data:', JSON.stringify(responseData, null, 2))
      throw new Error('No video URL found in CometAPI response')
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
      message: '✨ Video generated successfully with Sora 2 via CometAPI!',
      provider: 'CometAPI'
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
