export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, userPrompt } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    // Get OpenAI API key from environment or request
    const openaiApiKey = req.body.apiKey || process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key required',
        message: 'กรุณาใส่ OpenAI API key หรือตั้งค่าใน environment variables'
      })
    }

    // Prepare the base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating advertising prompts for product images.
            Analyze the product image and create a detailed, creative prompt in Thai language that can be used to generate premium advertisement images.
            Focus on: product features, target audience, emotions to convey, visual style, and atmosphere.
            Make the prompt detailed and professional for high-quality ad generation.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt || 'วิเคราะห์ภาพสินค้านี้และสร้าง prompt ที่ดีที่สุดสำหรับการสร้างภาพโฆษณาพรีเมี่ยม ให้คำแนะนำที่ละเอียดและสร้างสรรค์'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const analyzedPrompt = data.choices[0]?.message?.content

    if (!analyzedPrompt) {
      throw new Error('No prompt generated from OpenAI')
    }

    res.status(200).json({
      success: true,
      prompt: analyzedPrompt,
      model: 'gpt-4-vision-preview'
    })

  } catch (error) {
    console.error('OpenAI analysis error:', error)
    res.status(500).json({
      error: error.message || 'Failed to analyze with OpenAI',
      details: error.toString()
    })
  }
}