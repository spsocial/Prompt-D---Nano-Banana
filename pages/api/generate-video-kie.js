import { safeStringify } from '../../lib/logUtils';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  maxDuration: 600, // 10 minutes timeout for video generation
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
      userId = 'anonymous' // Add userId for tracking
    } = req.body

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' })
    }

    // Get KIE.AI API key from environment
    const kieApiKey = process.env.KIE_API_KEY

    if (!kieApiKey) {
      console.log('⚠️ KIE.AI API Key not found')
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

    // Save pending task to database immediately (before polling)
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
      console.log('✅ Saved pending task to database');
    } catch (err) {
      console.error('⚠️ Failed to save pending task:', err);
      // Don't fail request if database save fails
    }

    // Step 2: Poll for results
    const maxAttempts = 120 // Max 10 minutes (120 * 5 seconds)
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
              // Check for resultUrls array (KIE.AI format)
              if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                videoUrl = parsed.resultUrls[0]
              } else {
                videoUrl = parsed.video_url || parsed.videoUrl || parsed.url || parsed.videoSrc
              }
            } catch (e) {
              console.error('Failed to parse resultJson:', e)
              videoUrl = resultJson
            }
          } else {
            // Check for resultUrls array
            if (resultJson.resultUrls && Array.isArray(resultJson.resultUrls) && resultJson.resultUrls.length > 0) {
              videoUrl = resultJson.resultUrls[0]
            } else {
              videoUrl = resultJson.video_url ||
                        resultJson.videoUrl ||
                        resultJson.url ||
                        resultJson.videoSrc
            }
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

          // Update database with completed status
          try {
            await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/video-tasks/check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId })
            });
            console.log('✅ Updated database with completed video');
          } catch (err) {
            console.error('⚠️ Failed to update database:', err);
          }

          break
        } else {
          console.error('❌ Task completed but no video URL found')
          console.log('📄 Status data:', safeStringify(statusData))
          throw new Error('Task completed but no video URL found')
        }
      } else if (state === 'failed' || state === 'error' || state === 'FAILED' || state === 'ERROR') {
        const errorMsg = statusData.error || statusData.errorMessage || 'Task failed'
        console.error(`❌ Task failed: ${errorMsg}`)

        // Update database with failed status
        try {
          const prisma = (await import('../../lib/prisma')).default;
          await prisma.pendingVideo.updateMany({
            where: { taskId },
            data: {
              status: 'failed',
              error: errorMsg,
              updatedAt: new Date()
            }
          });
          console.log('✅ Updated database with failed status');
        } catch (err) {
          console.error('⚠️ Failed to update database:', err);
        }

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
      console.log('⏰ Timeout: Video not ready after 10 minutes - creating pending task')

      // Create pending video task for user to check later
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

      // Return pending status with taskId (NOT an error!)
      return res.status(202).json({
        success: true,
        isPending: true,
        taskId: taskId,
        message: 'วิดีโอกำลังสร้างอยู่ กรุณารอสักครู่แล้วเช็คสถานะอีกครั้ง',
        checkStatusUrl: `/api/video-tasks/check`,
        suggestion: 'คุณสามารถปิดหน้านี้ได้ และกลับมาเช็คสถานะทีหลัง'
      });
    }

    console.log(`🎉 KIE.AI video generation complete!`)
    console.log(`📹 Video URL: ${videoUrl}`)

    // Track video generation with cost (KIE Sora 2 cost: 5.1 baht per video)
    try {
      const trackResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/track-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'success',
          data: {
            userId,
            model: modelName,
            mode: image ? 'image-to-video' : 'text-to-video',
            prompt: prompt || 'Image to video',
            duration: duration,
            aspectRatio: aspectRatio,
            creditsUsed: duration, // duration = credits used
            apiCost: 5.1 // KIE Sora 2 cost in baht
          }
        })
      })
      console.log('📊 Video generation tracked successfully')
    } catch (trackError) {
      console.error('⚠️ Failed to track video generation:', trackError)
      // Don't fail the request if tracking fails
    }

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
