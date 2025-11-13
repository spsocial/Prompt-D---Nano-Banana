// API endpoint for starting video generation (mobile-friendly, no polling)
import { safeStringify } from '../../../lib/logUtils';

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

    // Add image if provided
    if (image) {
      if (image.startsWith('data:')) {
        return res.status(400).json({
          error: 'KIE.AI requires image URLs, not base64',
          suggestion: 'กรุณาใช้ CometAPI สำหรับการอัพโหลดภาพจากเครื่อง'
        })
      }
      requestBody.input.image_urls = [image]
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
      await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/video-tasks/create`, {
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
