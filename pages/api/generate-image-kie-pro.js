import { safeStringify } from '../../lib/logUtils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      console.log(`📝 Image size: ${base64Image.length} chars`)
      console.log(`📝 Upload preset: ${cloudinaryUploadPreset}`)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: base64Image,
          upload_preset: cloudinaryUploadPreset
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
  maxDuration: 300, // 5 minutes timeout for image generation
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      prompt,
      aspectRatio = '1:1',
      resolution = '1K', // 1K, 2K, or 4K
      outputFormat = 'png',
      imageInput = [], // Optional: array of image URLs for image-to-image
      userId = 'anonymous'
    } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
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

    console.log(`🎨 Starting Nano Banana PRO image generation via KIE.AI...`)
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`)
    console.log(`📐 Aspect Ratio: ${aspectRatio}`)
    console.log(`📊 Resolution: ${resolution}`)
    console.log(`🖼️ Output Format: ${outputFormat}`)

    // Process image inputs if provided
    let processedImageInputs = []
    if (imageInput && imageInput.length > 0) {
      console.log(`📸 Processing ${imageInput.length} input image(s)...`)

      for (const img of imageInput) {
        if (img.startsWith('data:')) {
          // Base64 image, need to upload to Cloudinary first
          console.log('🔄 Base64 image detected, uploading to Cloudinary...')
          try {
            const imageUrl = await uploadToCloudinary(img)
            processedImageInputs.push(imageUrl)
            console.log(`✅ Uploaded: ${imageUrl}`)
          } catch (uploadError) {
            console.error('❌ Failed to upload to Cloudinary:', uploadError)
            return res.status(500).json({
              error: 'Cannot upload image to Cloudinary',
              details: uploadError.message,
              suggestion: 'ตรวจสอบ CLOUDINARY_CLOUD_NAME และ CLOUDINARY_UPLOAD_PRESET'
            })
          }
        } else {
          // Already a URL
          processedImageInputs.push(img)
        }
      }
    }

    // Prepare request body for Nano Banana Pro model
    const requestBody = {
      model: 'nano-banana-pro',
      input: {
        prompt: prompt,
        image_input: processedImageInputs,
        aspect_ratio: aspectRatio,
        resolution: resolution,
        output_format: outputFormat
      }
    }

    console.log('🚀 Creating image task on KIE.AI...')
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
      console.error('📄 Full response:', safeStringify(createData))
      throw new Error('No task ID received from KIE.AI')
    }

    console.log(`✅ Task created: ${taskId}`)

    // Step 2: Poll for results
    const maxAttempts = 60 // Max 5 minutes (60 * 5 seconds)
    let attempts = 0
    let imageUrl = null

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

      // Extract state
      const state = statusData.state ||
                    statusData.status ||
                    statusData.data?.state ||
                    statusData.data?.status ||
                    statusData.result?.state ||
                    statusData.result?.status

      console.log(`📊 Task state: ${state}`)

      if (state === 'completed' || state === 'success' || state === 'SUCCESS' || state === '3') {
        // Extract image URL from result
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
                imageUrl = parsed.resultUrls[0]
              } else {
                imageUrl = parsed.image_url || parsed.imageUrl || parsed.url || parsed.output
              }
            } catch (e) {
              console.error('Failed to parse resultJson:', e)
              imageUrl = resultJson
            }
          } else {
            // Check for resultUrls array
            if (resultJson.resultUrls && Array.isArray(resultJson.resultUrls) && resultJson.resultUrls.length > 0) {
              imageUrl = resultJson.resultUrls[0]
            } else {
              imageUrl = resultJson.image_url ||
                        resultJson.imageUrl ||
                        resultJson.url ||
                        resultJson.output
            }
          }
        }

        // Also check direct fields
        if (!imageUrl) {
          imageUrl = statusData.image_url ||
                    statusData.imageUrl ||
                    statusData.url ||
                    statusData.data?.imageUrl ||
                    statusData.data?.image_url
        }

        if (imageUrl) {
          console.log(`✅ Image ready: ${imageUrl}`)
          break
        } else {
          console.error('❌ Task completed but no image URL found')
          console.log('📄 Status data:', safeStringify(statusData))
          throw new Error('Task completed but no image URL found')
        }
      } else if (state === 'failed' || state === 'error' || state === 'FAILED' || state === 'ERROR') {
        const errorMsg = statusData.error || statusData.errorMessage || 'Task failed'
        console.error(`❌ Task failed: ${errorMsg}`)
        throw new Error(errorMsg)
      } else if (state === 'processing' || state === 'pending' || state === 'PROCESSING' || state === 'PENDING' || state === 'waiting') {
        // Continue polling
        console.log('⏳ Task still processing...')
      } else {
        console.log(`⚠️ Unknown state: ${state}`)
      }
    }

    if (!imageUrl) {
      throw new Error('Timeout: Image not ready after 5 minutes')
    }

    console.log(`🎉 KIE.AI Nano Banana PRO generation complete!`)
    console.log(`🖼️ Image URL: ${imageUrl}`)

    // Log usage to database
    try {
      console.log('📊 Logging usage to database...')

      const API_COST = 4.0 // 4 baht per image for Nano Banana PRO
      const CREDITS_USED = 3 // 3 credits per image

      await prisma.imageGeneration.create({
        data: {
          userId: userId,
          style: 'nano-banana-pro', // For backward compatibility
          model: 'nano-banana-pro',
          prompt: prompt,
          aspectRatio: aspectRatio,
          resolution: resolution,
          creditsUsed: CREDITS_USED,
          apiCost: API_COST,
          success: true
        }
      })

      // Update daily stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await prisma.dailyStats.upsert({
        where: { date: today },
        update: {
          totalImages: { increment: 1 },
          imagesNanoBananaPro: { increment: 1 },
          apiCostImages: { increment: API_COST }
        },
        create: {
          date: today,
          totalImages: 1,
          imagesNanoBananaPro: 1,
          apiCostImages: API_COST
        }
      })

      // Update monthly stats
      const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

      await prisma.monthlyStats.upsert({
        where: { month: monthKey },
        update: {
          totalImages: { increment: 1 },
          imagesNanoBananaPro: { increment: 1 },
          apiCostImages: { increment: API_COST }
        },
        create: {
          month: monthKey,
          totalImages: 1,
          imagesNanoBananaPro: 1,
          apiCostImages: API_COST
        }
      })

      console.log('✅ Usage logged successfully')
    } catch (logError) {
      console.error('❌ Failed to log usage:', logError)
      // Don't fail the request if logging fails
    }

    // Return success response
    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      taskId: taskId,
      aspectRatio: aspectRatio,
      resolution: resolution,
      prompt: prompt,
      model: 'nano-banana-pro',
      message: `✨ สร้างภาพสำเร็จด้วย Nano Banana PRO (${resolution})!`,
      provider: 'KIE.AI Nano Banana PRO'
    })

  } catch (error) {
    console.error('❌ KIE.AI Nano Banana PRO generation error:', error)

    res.status(500).json({
      error: error.message || 'Failed to generate image',
      details: error.toString(),
      suggestion: '⚠️ เกิดข้อผิดพลาดในการสร้างภาพผ่าน KIE.AI Nano Banana PRO'
    })
  }
}
