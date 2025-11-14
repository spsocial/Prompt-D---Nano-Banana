// API endpoint for starting video generation (mobile-friendly, no polling)
import { safeStringify } from '../../../lib/logUtils';

// Helper function to upload base64 image to Cloudinary (with retry)
async function uploadToCloudinary(base64Image, retries = 3) {
  console.log('📤 Uploading base64 image to Cloudinary...')

  const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME
  const cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error('Cloudinary not configured (need CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET)')
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📤 Upload attempt ${attempt}/${retries}...`)

      // Generate safe public_id without slashes
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const safePublicId = `nano_img_${timestamp}_${randomId}`

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: base64Image,
          upload_preset: cloudinaryUploadPreset,
          public_id: safePublicId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const imageUrl = data.secure_url || data.url

      if (!imageUrl) {
        throw new Error('No URL in Cloudinary response')
      }

      console.log(`✅ Image uploaded to Cloudinary: ${imageUrl}`)
      return imageUrl
    } catch (error) {
      console.error(`❌ Upload attempt ${attempt} failed:`, error.message)

      if (attempt === retries) {
        console.error('❌ All upload attempts failed')
        throw error
      }

      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
      console.log(`⏳ Retrying in ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  maxDuration: 60, // Only 60s for task creation, no polling
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
      userId = 'anonymous'
    } = req.body

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' })
    }

    // Get KIE.AI API key
    const kieApiKey = process.env.KIE_API_KEY

    if (!kieApiKey) {
      return res.status(400).json({
        error: 'KIE.AI API key is required',
        message: 'กรุณาตั้งค่า KIE_API_KEY ใน Railway environment variables'
      })
    }

    console.log(`🎬 Starting video generation (mobile mode - no polling)...`)
    console.log(`📝 Model: ${model}`)
    console.log(`📝 Mode: ${image ? 'Image to Video' : 'Text to Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Aspect: ${aspectRatio}`)

    // Determine model name
    let modelName
    if (image) {
      modelName = model.includes('pro') ? 'sora-2-pro-image-to-video' : 'sora-2-image-to-video'
    } else {
      modelName = model.includes('pro') ? 'sora-2-pro-text-to-video' : 'sora-2-text-to-video'
    }

    console.log(`🎯 Using KIE.AI model: ${modelName}`)

    // Map aspect ratio
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

    // Handle image: if base64, upload to Cloudinary first to get URL
    if (image) {
      let imageUrl = image

      if (image.startsWith('data:')) {
        console.log('🔄 Base64 image detected, uploading to Cloudinary first...')
        try {
          imageUrl = await uploadToCloudinary(image)
          console.log(`✅ Converted base64 → Cloudinary URL: ${imageUrl}`)
        } catch (uploadError) {
          console.error('❌ Failed to upload to Cloudinary:', uploadError)
          throw new Error('Cannot upload image to Cloudinary')
        }
      }

      requestBody.input.image_urls = [imageUrl]
    }

    // Add Pro model parameters
    if (model.includes('pro')) {
      requestBody.input.n_frames = String(duration)
      requestBody.input.size = model.includes('1080p') ? 'high' : 'standard'
    }

    console.log('🚀 Creating task on KIE.AI (mobile mode)...')

    // Step 1: Create Task ONLY (no polling)
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

      let errorMessage = 'Failed to create task on KIE.AI'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch (e) {
        errorMessage = errorText.substring(0, 200)
      }

      throw new Error(errorMessage)
    }

    const createData = await createResponse.json()
    console.log('📄 KIE.AI Create Response:', safeStringify(createData))

    // Extract taskId
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
      throw new Error('No task ID received from KIE.AI')
    }

    console.log(`✅ Task created: ${taskId}`)

    // Create pending video task in database
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      await fetch(`${baseUrl}/api/video-tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskId,
          model: modelName,
          mode: image ? 'image-to-video' : 'text-to-video',
          prompt: prompt || 'Image to video',
          sourceImage: image || null,
          duration: duration,
          aspectRatio: aspectRatio,
          creditsUsed: duration
        })
      });
      console.log('✅ Created pending task record');
    } catch (err) {
      console.error('⚠️ Failed to create pending task:', err);
    }

    // Return immediately with taskId (don't wait for video)
    res.status(202).json({
      success: true,
      isPending: true,
      taskId: taskId,
      message: '🎬 วิดีโอกำลังสร้างอยู่',
      info: 'คุณสามารถปิดหน้านี้ได้ วิดีโอจะพร้อมใน 5-10 นาที',
      checkStatusUrl: `/api/video-tasks/check`,
      mobileFriendly: true
    })

  } catch (error) {
    console.error('❌ Video task creation error:', error)

    res.status(500).json({
      error: error.message || 'Failed to start video generation',
      details: error.toString(),
      suggestion: '⚠️ เกิดข้อผิดพลาดในการสร้าง task - เครดิตจะถูกคืนอัตโนมัติ',
      shouldRefund: true
    })
  }
}
