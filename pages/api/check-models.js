// Check available models for the API key
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = req.query.key || 'AIzaSyCaUEO45dTltA6huicctEvJEOT0GC4Qzsg'

    // List all available models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json({
        error: 'Failed to fetch models',
        details: error
      })
    }

    const data = await response.json()

    // Filter models that support image generation
    const imageModels = data.models?.filter(model =>
      model.supportedGenerationMethods?.includes('generateContent') &&
      (model.name.includes('imagen') ||
       model.name.includes('image') ||
       model.name.includes('flash-exp') ||
       model.name.includes('2.0'))
    ) || []

    // Test gemini-2.0-flash-exp specifically
    const testModels = [
      'gemini-2.0-flash-exp',
      'gemini-exp-1206',
      'gemini-2.0-flash-thinking-exp',
      'imagen-3.0-generate-001',
      'imagen-3.0-fast-generate-001'
    ]

    const modelTests = []

    for (const modelName of testModels) {
      try {
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: 'สร้างภาพแมวน่ารัก' }]
              }],
              generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
              }
            })
          }
        )

        const result = await testResponse.json()

        modelTests.push({
          model: modelName,
          status: testResponse.status,
          success: testResponse.ok,
          canGenerateImages: result.candidates?.[0]?.content?.parts?.some(p => p.inlineData) || false,
          error: result.error?.message
        })
      } catch (err) {
        modelTests.push({
          model: modelName,
          error: err.message
        })
      }
    }

    res.status(200).json({
      apiKey: apiKey.substring(0, 10) + '...',
      availableModels: data.models?.map(m => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods
      })) || [],
      imageCapableModels: imageModels,
      modelTests,
      recommendation: modelTests.find(m => m.success && m.canGenerateImages)?.model ||
                      'gemini-2.0-flash-exp',
      note: 'Gemini Flash Experimental (2.0) รองรับการสร้างภาพผ่าน text prompts'
    })

  } catch (error) {
    console.error('Model check error:', error)
    res.status(500).json({
      error: error.message || 'Failed to check models'
    })
  }
}