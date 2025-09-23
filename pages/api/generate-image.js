import Replicate from 'replicate'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompts, replicateApiKey } = req.body

    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'No prompts provided' })
    }

    // Use provided Replicate API key or environment variable
    const apiKey = replicateApiKey || process.env.REPLICATE_API_TOKEN

    if (!apiKey) {
      // If no Replicate API key, return placeholder images with descriptions
      return res.status(200).json({
        results: prompts.map((promptData, index) => ({
          style: promptData.style,
          description: promptData.prompt.substring(0, 200),
          imageUrl: `/api/placeholder?style=${encodeURIComponent(promptData.style)}&seed=${Date.now()}_${index}`,
          prompt: promptData.prompt,
          isPlaceholder: true
        })),
        success: true,
        message: 'Placeholder images generated (no Replicate API key provided)'
      })
    }

    const replicate = new Replicate({
      auth: apiKey,
    })

    // Generate images using Stable Diffusion XL
    const results = await Promise.all(
      prompts.map(async (promptData) => {
        try {
          // Use Stable Diffusion XL for high-quality images
          const output = await replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            {
              input: {
                prompt: promptData.prompt,
                negative_prompt: "low quality, blurry, distorted, amateur, unprofessional, watermark, text, logo",
                width: 1024,
                height: 1024,
                num_outputs: 1,
                scheduler: "K_EULER",
                num_inference_steps: 50,
                guidance_scale: 7.5,
                refine: "expert_ensemble_refiner",
                high_noise_frac: 0.8,
              }
            }
          )

          // Replicate returns an array of URLs
          const imageUrl = Array.isArray(output) ? output[0] : output

          return {
            style: promptData.style,
            imageUrl: imageUrl,
            prompt: promptData.prompt,
            isPlaceholder: false
          }

        } catch (error) {
          console.error('Replicate generation error:', error)

          // Fallback to placeholder if generation fails
          return {
            style: promptData.style,
            error: 'Failed to generate with Stable Diffusion',
            imageUrl: `/api/placeholder?style=${encodeURIComponent(promptData.style)}&seed=${Math.random()}`,
            prompt: promptData.prompt,
            isPlaceholder: true
          }
        }
      })
    )

    res.status(200).json({
      results,
      success: true,
      message: 'Images generated with Stable Diffusion XL'
    })

  } catch (error) {
    console.error('Image generation error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate images',
      details: error.response?.data || null
    })
  }
}