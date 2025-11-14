import { safeStringify } from '../../lib/logUtils';
import { PrismaClient } from '@prisma/client';

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
  maxDuration: 2700, // 45 minutes timeout
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Extract variables at top level so catch block can access them
  const {
    prompt,
    image,
    duration = 10,
    resolution = '720p',
    aspectRatio = '16:9',
    allowWatermark = false,
    model = 'sora-2',
    userId = 'anonymous'
  } = req.body

  try {

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' })
    }

    const kieApiKey = process.env.KIE_API_KEY

    if (!kieApiKey) {
      return res.status(400).json({
        error: 'KIE.AI API key is required',
        message: 'กรุณาตั้งค่า KIE_API_KEY ใน Railway environment variables'
      })
    }

    console.log(`🎬 Starting video generation via KIE.AI (Primary)...`)
    console.log(`📝 Mode: ${image ? 'Image-to-Video' : 'Text-to-Video'}`)
    console.log(`⏱️ Duration: ${duration}s, Aspect: ${aspectRatio}`)
    console.log(`💧 Remove Watermark: ${!allowWatermark}`)

    // Determine model name based on kie.ai docs
    let modelName
    if (image) {
      modelName = 'sora-2-image-to-video'
    } else {
      modelName = 'sora-2-text-to-video'
    }

    console.log(`🎯 Using KIE.AI model: ${modelName}`)

    // Map aspect ratio to kie.ai format
    const kieAspectRatio = aspectRatio === '16:9' ? 'landscape' : 'portrait'

    // Prepare request body according to kie.ai docs
    const requestBody = {
      model: modelName,
      input: {
        prompt: prompt || 'Create a cinematic video',
        aspect_ratio: kieAspectRatio,
        n_frames: String(duration), // "10" or "15"
        remove_watermark: !allowWatermark
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

    // Extract taskId from response
    const taskId = createData.data?.taskId

    if (!taskId) {
      console.error('❌ No task ID received from KIE.AI')
      console.error('📄 Full response:', safeStringify(createData))
      throw new Error('No task ID received from KIE.AI')
    }

    console.log(`✅ Task created: ${taskId}`)

    // Save pending task to database immediately (before polling)
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
          model: 'sora-2',
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

      // DEBUG: Log first polling response
      if (attempts === 1) {
        console.log('📄 First Polling Response:', safeStringify(statusData))
      }

      const state = statusData.data?.state

      console.log(`📊 Task state: ${state}`)

      // DEBUG: Log full status response every 10 attempts
      if (attempts % 10 === 0) {
        console.log('📄 Status Response:', safeStringify(statusData))
      }

      if (state === 'generating') {
        // Task is actively generating - continue polling
        console.log('🎨 Video is being generated...')
      } else if (state === 'success') {
        // Extract video URL from result
        const resultJson = statusData.data?.resultJson

        if (resultJson) {
          let parsed
          if (typeof resultJson === 'string') {
            try {
              parsed = JSON.parse(resultJson)
            } catch (e) {
              console.error('Failed to parse resultJson:', e)
              parsed = null
            }
          } else {
            parsed = resultJson
          }

          if (parsed && parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
            videoUrl = parsed.resultUrls[0]
            console.log(`✅ Video ready: ${videoUrl}`)

            // Update database with completed status
            try {
              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
              const baseUrl = `${protocol}://${host}`;

              await fetch(`${baseUrl}/api/video-tasks/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
              });
              console.log('✅ Updated database with completed video');
            } catch (err) {
              console.error('⚠️ Failed to update database:', err);
            }

            break
          }
        }

        if (!videoUrl) {
          console.error('❌ Task completed but no video URL found')
          console.log('📄 Status data:', safeStringify(statusData))
          throw new Error('Task completed but no video URL found')
        }
      } else if (state === 'fail') {
        const failMsg = statusData.data?.failMsg || 'Task failed'
        const failCode = statusData.data?.failCode || 'unknown'
        console.error(`❌ Task failed: ${failMsg} (code: ${failCode})`)

        // Update database with failed status
        try {
          const prisma = new PrismaClient();
          await prisma.pendingVideo.updateMany({
            where: { taskId },
            data: {
              status: 'failed',
              error: failMsg,
              updatedAt: new Date()
            }
          });
          await prisma.$disconnect();
          console.log('✅ Updated database with failed status');
        } catch (err) {
          console.error('⚠️ Failed to update database:', err);
        }

        throw new Error(`Task failed: ${failMsg}`)
      } else if (state === 'waiting') {
        console.log('⏳ Task still waiting/processing...')
      } else {
        console.log(`⚠️ Unknown state: ${state}`)
      }
    }

    if (!videoUrl) {
      console.error('❌ Timeout: Video not ready after 10 minutes')
      throw new Error('Timeout: Video generation took too long (>10 minutes)')
    }

    console.log(`🎉 KIE.AI video generation complete!`)
    console.log(`📹 Video URL: ${videoUrl}`)

    // Track successful video generation
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      await fetch(`${baseUrl}/api/track-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'success',
          data: {
            userId,
            model: 'sora-2',
            mode: image ? 'image-to-video' : 'text-to-video',
            prompt: prompt || 'Image to video',
            duration: duration,
            aspectRatio: aspectRatio,
            creditsUsed: duration,
            apiCost: 5.1 // KIE Sora 2 cost in baht
          }
        })
      }).catch(err => console.log('Analytics tracking failed:', err));
      console.log('📊 Video generation tracked successfully');
    } catch (trackingError) {
      console.log('Video tracking error:', trackingError);
      // Don't fail the request if tracking fails
    }

    // Return success response
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      taskId: taskId,
      duration: duration,
      resolution: resolution,
      aspectRatio: aspectRatio,
      mode: image ? 'image-to-video' : 'text-to-video',
      model: modelName,
      message: '✨ วิดีโอสร้างเสร็จแล้ว',
      provider: 'KIE.AI',
      watermarkRemoved: !allowWatermark,
      hasWatermark: allowWatermark
    })

  } catch (error) {
    console.error('❌ KIE.AI video generation error:', error)

    // Refund credits automatically
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      console.log(`🔄 Refunding ${duration} credits to user ${userId}...`);
      const refundResponse = await fetch(`${baseUrl}/api/add-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: duration,
          reason: `Refund: Video generation failed - ${error.message}`
        })
      });

      const refundData = await refundResponse.json();
      if (refundData.success) {
        console.log(`✅ Refunded ${duration} credits successfully. New balance: ${refundData.newBalance}`);
      } else {
        console.error('⚠️ Failed to refund credits:', refundData.message);
      }
    } catch (refundError) {
      console.error('❌ Error refunding credits:', refundError);
    }

    // Track video generation error
    try {
      const errorType = error.message.includes('Timeout') ? 'timeout'
                      : error.message.includes('No task ID') ? 'no_task_id'
                      : error.message.includes('failed') ? 'task_failed'
                      : 'api_error';

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      await fetch(`${baseUrl}/api/track-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'error',
          data: {
            userId,
            model: 'sora-2',
            mode: image ? 'image-to-video' : 'text-to-video',
            errorType: errorType,
            errorMessage: error.message,
            creditsRefunded: duration
          }
        })
      }).catch(err => console.log('Error tracking failed:', err));
      console.log('📊 Video error tracked successfully');
    } catch (trackingError) {
      console.log('Error tracking error:', trackingError);
    }

    res.status(500).json({
      error: error.message || 'Failed to generate video',
      details: error.toString(),
      suggestion: '✅ เครดิตถูกคืนอัตโนมัติแล้ว - กรุณาลองใหม่อีกครั้ง',
      creditsRefunded: duration
    })
  }
}
