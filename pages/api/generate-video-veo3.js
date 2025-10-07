export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes timeout
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
      model = 'veo3-fast'
    } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Use CometAPI key
    const cometApiKey = apiKey || process.env.COMET_API_KEY

    if (!cometApiKey) {
      return res.status(400).json({
        error: 'CometAPI key is required',
        message: 'Please provide a CometAPI key'
      })
    }

    console.log(`🎬 Starting Veo3 video generation...`)
    console.log(`📝 Model: ${model}`)
    console.log(`📝 Mode: ${image ? 'Image-to-Video' : 'Text-to-Video'}`)
    console.log(`📝 Prompt: ${prompt}`)

    // Prepare message content based on mode
    let messageContent
    let actualModel = model

    if (image) {
      // Image-to-Video: use veo3-fast-frames and array content format
      actualModel = 'veo3-fast-frames'
      messageContent = [
        {
          type: 'text',
          text: prompt || 'Generate a video from this image'
        },
        {
          type: 'image_url',
          image_url: {
            url: image
          }
        }
      ]
    } else {
      // Text-to-Video: simple string content
      messageContent = prompt
    }

    // Prepare request
    const requestPayload = {
      model: actualModel,
      stream: true, // IMPORTANT: Veo3 uses streaming
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      max_tokens: 300
    }

    console.log('🚀 Sending request to CometAPI...')
    console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2))

    // Call CometAPI with streaming
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

    // Read streaming response
    const reader = createResponse.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let taskId = null
    let previewUrl = null
    let finalUrl = null
    let currentStatus = 'starting'

    console.log('📡 Reading streaming response...')

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log('✅ Stream complete')
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue

        console.log('📨 Chunk:', line.substring(0, 200))

        // Extract Task ID
        if (line.includes('Task ID:') && !taskId) {
          const match = line.match(/Task ID:\s*`?([^`\s]+)`?/)
          if (match) {
            taskId = match[1]
            console.log(`✅ Task ID: ${taskId}`)
          }
        }

        // Extract Preview URL
        if (line.includes('Preview video generated') || line.includes('📺 Online Preview')) {
          currentStatus = 'preview_ready'
          // Look for URL in markdown link format
          const urlMatch = line.match(/https:\/\/[^\s\)\]]+\.mp4/)
          if (urlMatch) {
            previewUrl = urlMatch[0]
            console.log(`✅ Preview URL: ${previewUrl}`)
          }
        }

        // Extract Final URL
        if (line.includes('High-quality video generated') || line.includes('▶️ Watch Online')) {
          currentStatus = 'completed'
          // Look for URL in markdown link format
          const urlMatch = line.match(/https:\/\/[^\s\)\]]+\.mp4/)
          if (urlMatch) {
            finalUrl = urlMatch[0]
            console.log(`✅ Final URL: ${finalUrl}`)
          }
        }

        // Check for errors
        if (line.includes('❌') || line.includes('error') || line.includes('failed')) {
          console.error('⚠️ Possible error in stream:', line)
        }
      }

      // If we have final URL, we can break early
      if (finalUrl) {
        console.log('🎉 Final video ready, stopping stream')
        break
      }
    }

    // Use final URL if available, otherwise preview
    const videoUrl = finalUrl || previewUrl

    if (!videoUrl) {
      console.error('❌ No video URL found in response')
      throw new Error('No video URL found in response. Please try again.')
    }

    console.log(`🎉 Video generation complete!`)
    console.log(`📹 Video URL: ${videoUrl}`)
    console.log(`📊 Status: ${currentStatus}`)

    // Return video URL
    res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      previewUrl: previewUrl,
      finalUrl: finalUrl,
      taskId: taskId,
      status: currentStatus,
      model: model,
      message: '✨ Video generated successfully with Veo3!',
      provider: 'CometAPI (Veo3)'
    })

  } catch (error) {
    console.error('❌ Video generation error:', error)

    res.status(500).json({
      error: error.message || 'Failed to generate video',
      details: error.toString(),
      suggestion: 'Please try again or check your API key',
      apiStatus: 'error'
    })
  }
}
