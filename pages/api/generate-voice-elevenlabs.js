export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
  maxDuration: 60, // 1 minute max for TTS
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      text,
      voiceId, // voice_id from ElevenLabs
      userId = 'anonymous',
      isPreview = false
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    // Check API key
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return res.status(400).json({
        error: 'ElevenLabs API key not configured',
        message: 'กรุณาตั้งค่า ELEVENLABS_API_KEY ใน Railway environment variables'
      });
    }

    console.log(`🎙️ Generating TTS with ElevenLabs...`);
    console.log(`   Voice ID: ${voiceId}`);
    console.log(`   Text length: ${text.length} characters`);
    console.log(`   Is Preview: ${isPreview}`);
    console.log(`   User ID: ${userId}`);

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_v3', // Latest model - Supports 74 languages including Thai
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ ElevenLabs API error:', errorData);

      throw new Error(
        errorData.detail?.message ||
        errorData.message ||
        `ElevenLabs API error: ${response.status}`
      );
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();

    // Convert to base64
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // ElevenLabs returns MP3 by default
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(`✅ Audio generated successfully!`);
    console.log(`   MIME Type: audio/mpeg`);
    console.log(`   Size: ${audioBase64.length} characters (base64)`);

    // Estimate duration (rough estimate: 150 chars/sec for Thai)
    const estimatedDuration = Math.ceil(text.length / 150);

    // Calculate API cost
    // ElevenLabs Starter: $5/month for 30,000 chars = $0.000167 per char
    // = 0.006 THB per char (at 36 THB/USD)
    const apiCost = (text.length * 0.006).toFixed(2);

    // Track analytics (only for non-preview)
    if (!isPreview && userId !== 'preview') {
      try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        await fetch(`${baseUrl}/api/track-voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'success',
            data: {
              userId,
              voice: voiceId,
              textLength: text.length,
              duration: estimatedDuration,
              provider: 'ElevenLabs',
              apiCost: parseFloat(apiCost)
            }
          })
        }).catch(err => console.log('Analytics tracking failed:', err));

        console.log('📊 Voice generation tracked successfully');
      } catch (trackingError) {
        console.log('Voice tracking error:', trackingError);
        // Don't fail the request if tracking fails
      }
    }

    res.status(200).json({
      success: true,
      audioUrl,
      voiceId,
      duration: estimatedDuration,
      provider: 'Premium AI',
      mimeType: 'audio/mpeg',
      credits: isPreview ? 0 : 5, // 5 credits for Premium Voice
      apiCost: parseFloat(apiCost),
      isPreview
    });

  } catch (error) {
    console.error('❌ ElevenLabs TTS error:', error);

    // Check for API key errors
    const isApiKeyError = error.message.includes('API key') ||
                          error.message.includes('authentication') ||
                          error.message.includes('401') ||
                          error.message.includes('unauthorized');

    // Check for quota errors
    const isQuotaError = error.message.includes('quota') ||
                        error.message.includes('rate limit') ||
                        error.message.includes('429');

    // Check for voice errors
    const isVoiceError = error.message.includes('voice') ||
                        error.message.includes('not found') ||
                        error.message.includes('404');

    res.status(500).json({
      error: error.message || 'Failed to generate voice',
      details: error.toString(),
      suggestion: isApiKeyError
        ? '🔑 API Key ไม่ถูกต้อง - กรุณาตรวจสอบ ELEVENLABS_API_KEY'
        : isQuotaError
        ? '⏱️ เกินโควต้าหรือ Rate Limit - กรุณารอสักครู่แล้วลองใหม่'
        : isVoiceError
        ? '🎤 ไม่พบเสียงนี้ - กรุณาตรวจสอบ Voice ID'
        : 'เกิดข้อผิดพลาดในการสร้างเสียง - กรุณาลองใหม่อีกครั้ง',
      apiStatus: isApiKeyError ? 'invalid_key' : isQuotaError ? 'quota_error' : isVoiceError ? 'voice_error' : 'unknown_error'
    });
  }
}
