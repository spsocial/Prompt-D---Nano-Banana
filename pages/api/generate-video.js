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

    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key is required',
        message: 'Please provide an OpenAI API key to use Sora video generation'
      })
    }

    console.log(`🎬 Starting Sora video generation...`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Resolution: ${resolution}, Aspect: ${aspectRatio}`)

    // Step 1: Create video generation job
    const createJobPayload = {
      model: 'sora-2',
      prompt: prompt || 'Create a video based on this image',
      duration: duration,
      resolution: resolution,
      aspect_ratio: aspectRatio
    }

    // Add image if provided (Image to Video mode)
    if (image) {
      // Extract base64 data
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      createJobPayload.image = base64Data
    }

    console.log('🚀 Creating video generation job...')

    // Create job using OpenAI Sora API
    const createResponse = await fetch('https://api.openai.com/v1/sora/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createJobPayload)
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('❌ Failed to create job:', errorText)

      // Try to parse as JSON, otherwise return text error
      let errorMessage = 'Failed to create video generation job'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.message || errorData.message || errorMessage
      } catch (e) {
        // If not JSON, check if Sora API is not available
        if (errorText.includes('<html') || errorText.includes('<!DOCTYPE')) {
          errorMessage = 'Sora API is not available yet. Please check OpenAI API status or try again later.'
        } else {
          errorMessage = errorText.substring(0, 200) // First 200 chars of error
        }
      }

      throw new Error(errorMessage)
    }

    const jobData = await createResponse.json()
    const jobId = jobData.id

    console.log(`✅ Job created: ${jobId}`)

    // Step 2: Poll for job completion
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max (5s interval)
    let videoUrl = null
    let jobStatus = 'processing'

    while (attempts < maxAttempts && jobStatus === 'processing') {
      attempts++

      // Wait 5 seconds before checking status
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log(`⏳ Checking status (attempt ${attempts}/${maxAttempts})...`)

      const statusResponse = await fetch(`https://api.openai.com/v1/sora/videos/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!statusResponse.ok) {
        console.error('❌ Failed to check status')
        continue
      }

      const statusData = await statusResponse.json()
      jobStatus = statusData.status

      console.log(`📊 Status: ${jobStatus}`)

      if (jobStatus === 'succeeded') {
        videoUrl = statusData.video_url || statusData.url
        console.log(`✅ Video generation completed!`)
        break
      } else if (jobStatus === 'failed') {
        throw new Error(statusData.error?.message || 'Video generation failed')
      }
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out or no URL returned')
    }

    // Step 3: Return video URL
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      jobId: jobId,
      duration: duration,
      resolution: resolution,
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      message: '✨ Video generated successfully with Sora 2!'
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
