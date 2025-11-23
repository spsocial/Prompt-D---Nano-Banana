import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
  maxDuration: 60, // 1 minute max for TTS
}

// Helper function to create WAV header for PCM audio
function createWavHeader(pcmLength, sampleRate, numChannels, bitsPerSample) {
  const header = Buffer.alloc(44);

  // "RIFF" chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmLength, 4); // File size - 8
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // ByteRate
  header.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(pcmLength, 40); // Subchunk2Size

  return header;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      text,
      voice = 'Puck', // Default: Puck (female, upbeat)
      userId = 'anonymous',
      isPreview = false
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Check API key
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return res.status(400).json({
        error: 'Gemini API key not configured',
        message: 'กรุณาตั้งค่า GEMINI_API_KEY ใน Railway environment variables'
      });
    }

    console.log(`🎙️ Generating TTS with Gemini...`);
    console.log(`   Voice: ${voice}`);
    console.log(`   Text length: ${text.length} characters`);
    console.log(`   Is Preview: ${isPreview}`);
    console.log(`   User ID: ${userId}`);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Use Gemini 2.5 Flash TTS model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts'
    });

    // Generate TTS
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: text }]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      }
    });

    // Extract audio data
    const response = await result.response;

    // Check if audio data exists
    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error('❌ No candidates in response');
      throw new Error('No audio data received from Gemini');
    }

    const candidate = response.candidates[0];

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('❌ No parts in candidate content');
      throw new Error('No audio parts in response');
    }

    // Find the inline data part
    const audioPart = candidate.content.parts.find(part => part.inlineData);

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      console.error('❌ No inline data found in parts');
      throw new Error('No audio inline data in response');
    }

    const audioBase64 = audioPart.inlineData.data;
    const mimeType = audioPart.inlineData.mimeType || 'audio/mp3';

    console.log(`✅ Audio generated successfully!`);
    console.log(`   MIME Type: ${mimeType}`);
    console.log(`   Size: ${audioBase64.length} characters (base64)`);

    // Estimate duration (rough estimate: 150 chars/sec for Thai)
    const estimatedDuration = Math.ceil(text.length / 150);

    // Convert PCM to WAV if needed
    let audioUrl;
    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
      console.log('🔄 Converting PCM to WAV...');

      // Decode base64 to buffer
      const pcmBuffer = Buffer.from(audioBase64, 'base64');

      // Extract sample rate from mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
      const sampleRateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;
      const numChannels = 1; // Mono
      const bitsPerSample = 16;

      // Create WAV header
      const wavHeader = createWavHeader(pcmBuffer.length, sampleRate, numChannels, bitsPerSample);

      // Combine header + PCM data
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

      // Convert to base64
      const wavBase64 = wavBuffer.toString('base64');
      audioUrl = `data:audio/wav;base64,${wavBase64}`;

      console.log(`✅ Converted to WAV: ${wavBase64.length} characters`);
    } else {
      // Return as-is if already in supported format
      audioUrl = `data:${mimeType};base64,${audioBase64}`;
    }

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
              voice,
              textLength: text.length,
              duration: estimatedDuration,
              provider: 'gemini',
              apiCost: 0, // Free tier for now
              creditsUsed: 1 // Gemini = 1 credit
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
      voice,
      duration: estimatedDuration,
      provider: 'Gemini TTS',
      mimeType: mimeType.includes('L16') || mimeType.includes('pcm') ? 'audio/wav' : mimeType,
      credits: isPreview ? 0 : 1,
      isPreview
    });

  } catch (error) {
    console.error('❌ Gemini TTS error:', error);

    // Check for API key errors
    const isApiKeyError = error.message.includes('API key') ||
                          error.message.includes('authentication') ||
                          error.message.includes('401') ||
                          error.message.includes('403');

    // Check for quota errors
    const isQuotaError = error.message.includes('quota') ||
                        error.message.includes('rate limit') ||
                        error.message.includes('429');

    // Check for model errors
    const isModelError = error.message.includes('model') ||
                        error.message.includes('not found') ||
                        error.message.includes('404');

    res.status(500).json({
      error: error.message || 'Failed to generate voice',
      details: error.toString(),
      suggestion: isApiKeyError
        ? '🔑 API Key ไม่ถูกต้อง - กรุณาตรวจสอบ GEMINI_API_KEY'
        : isQuotaError
        ? '⏱️ เกินโควต้าหรือ Rate Limit - กรุณารอสักครู่แล้วลองใหม่'
        : isModelError
        ? '🤖 ไม่พบโมเดล Gemini TTS - กรุณาตรวจสอบว่า API รองรับ gemini-2.5-flash-preview-tts'
        : 'เกิดข้อผิดพลาดในการสร้างเสียง - กรุณาลองใหม่อีกครั้ง',
      apiStatus: isApiKeyError ? 'invalid_key' : isQuotaError ? 'quota_error' : isModelError ? 'model_error' : 'unknown_error'
    });
  }
}
