export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token, projectId } = req.body

    // Test different endpoint types
    const tests = []

    // Test 1: AI Studio endpoint with token as API key
    try {
      const response1 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: 'Test' }]
            }]
          })
        }
      )
      const data1 = await response1.json()
      tests.push({
        endpoint: 'AI Studio (as API key)',
        status: response1.status,
        success: response1.ok,
        data: data1
      })
    } catch (error) {
      tests.push({
        endpoint: 'AI Studio (as API key)',
        error: error.message
      })
    }

    // Test 2: AI Studio endpoint with Bearer token
    try {
      const response2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: 'Test' }]
            }]
          })
        }
      )
      const data2 = await response2.json()
      tests.push({
        endpoint: 'AI Studio (Bearer token)',
        status: response2.status,
        success: response2.ok,
        data: data2
      })
    } catch (error) {
      tests.push({
        endpoint: 'AI Studio (Bearer token)',
        error: error.message
      })
    }

    // Test 3: Cloud Vertex AI endpoint (needs project ID)
    if (projectId) {
      try {
        const response3 = await fetch(
          `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image-preview:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: 'Test' }]
              }]
            })
          }
        )
        const data3 = await response3.json()
        tests.push({
          endpoint: 'Google Cloud Vertex AI',
          status: response3.status,
          success: response3.ok,
          data: data3
        })
      } catch (error) {
        tests.push({
          endpoint: 'Google Cloud Vertex AI',
          error: error.message
        })
      }
    }

    res.status(200).json({
      tokenType: token.startsWith('AIza') ? 'API Key' : 'OAuth/Access Token',
      tokenLength: token.length,
      tests
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}