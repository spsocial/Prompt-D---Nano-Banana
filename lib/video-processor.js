// Background video generation processor
import { PrismaClient } from '@prisma/client';
import { safeStringify } from './logUtils';

const prisma = new PrismaClient();

// Main function to process video generation in background
export async function generateVideoBackground(taskId) {
  let task = null;

  try {
    console.log(`🎬 [Task ${taskId}] Starting background processing...`);

    // Fetch task details
    task = await prisma.videoTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      console.error(`❌ [Task ${taskId}] Task not found in database`);
      return;
    }

    // Update status to processing
    await prisma.videoTask.update({
      where: { id: taskId },
      data: {
        status: 'processing',
        startedAt: new Date()
      }
    });

    console.log(`📝 [Task ${taskId}] Model: ${task.model}, Mode: ${task.mode}`);

    // Get CometAPI key
    const cometApiKey = process.env.COMET_API_KEY;
    if (!cometApiKey) {
      throw new Error('COMET_API_KEY not configured');
    }

    // Prepare API request based on model
    const apiEndpoint = task.model === 'veo3-fast'
      ? 'https://api.cometapi.com/v1/chat/completions' // Veo3 endpoint
      : 'https://api.cometapi.com/v1/chat/completions'; // Sora endpoint

    // Map resolution to model name
    const modelName = task.model === 'veo3-fast'
      ? 'veo3-fast'
      : task.resolution === '1080p' ? 'sora-2-hd' : 'sora-2';

    // Map aspect ratio to size
    let size;
    if (task.aspectRatio === '16:9') {
      size = task.resolution === '1080p' ? '1792x1024' : '1280x720';
    } else if (task.aspectRatio === '9:16') {
      size = task.resolution === '1080p' ? '1024x1792' : '720x1280';
    } else if (task.aspectRatio === '1:1') {
      size = '1280x1280';
    } else {
      size = '1280x720';
    }

    // Prepare aspect ratio instruction
    let aspectRatioInstruction = '';
    if (task.aspectRatio === '16:9') {
      aspectRatioInstruction = '\n\nขนาดวิดีโอ: 16:9 แนวนอน';
    } else if (task.aspectRatio === '9:16') {
      aspectRatioInstruction = '\n\nขนาดวิดีโอ: 9:16 แนวตั้ง';
    }

    const cleanPrompt = (task.prompt || 'Create a cinematic video') + aspectRatioInstruction;

    // Prepare message content
    let messageContent;
    if (task.imageData) {
      // Image-to-video
      messageContent = [
        { type: 'text', text: cleanPrompt },
        { type: 'image_url', image_url: { url: task.imageData } }
      ];
    } else {
      // Text-to-video
      messageContent = cleanPrompt;
    }

    // Prepare request payload
    const requestPayload = {
      model: modelName,
      stream: true,
      max_tokens: 3000,
      size: size,
      seconds: String(task.duration),
      messages: [{ role: 'user', content: messageContent }]
    };

    console.log(`🚀 [Task ${taskId}] Calling CometAPI...`);

    // Call CometAPI
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cometApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Task ${taskId}] CometAPI error:`, errorText);
      throw new Error(`CometAPI error: ${errorText.substring(0, 200)}`);
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let videoUrl = null;
    let previewUrl = null;
    let accumulatedContent = '';

    console.log(`📡 [Task ${taskId}] Processing stream...`);

    // Helper to search for URL
    const searchForUrl = (content) => {
      if (!content) return null;
      const urlPatterns = [
        /!\[([^\]]*)\]\((https?:\/\/[^\)]+\.mp4[^\)]*)\)/,
        /!\[(https?:\/\/[^\]]+\.mp4[^\]]*)\]/,
        /\[Play online[^\]]*\]\((https?:\/\/[^\)]+\.mp4[^\)]*)\)/i,
        /https?:\/\/[^\s\)\]"'<>]+\.mp4[^\s\)\]"'<>]*/
      ];
      for (const pattern of urlPatterns) {
        const match = content.match(pattern);
        if (match) {
          const url = match[2] || match[1] || match[0];
          if (url && url.startsWith('http')) {
            return url.replace(/[\]\)]+$/, '');
          }
        }
      }
      return null;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith('data: [DONE]')) continue;

        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
            if (data.choices?.[0]?.delta?.content) {
              accumulatedContent += data.choices[0].delta.content;
            }
          } catch (e) {
            // Not JSON, continue
          }
        }

        // Look for URLs in line
        if (line.includes('.mp4')) {
          const foundUrl = line.match(/https?:\/\/[^\s\)\]]+\.mp4[^\s\)\]]*/) ||
                          searchForUrl(line);
          if (foundUrl) {
            const url = typeof foundUrl === 'string' ? foundUrl : foundUrl[0];
            if (line.includes('Preview') || line.includes('preview')) {
              previewUrl = url;
            } else {
              videoUrl = url;
            }
          }
        }

        if (videoUrl) break;
      }

      if (videoUrl) break;
    }

    // Final check in accumulated content
    if (!videoUrl && !previewUrl) {
      const foundUrl = searchForUrl(accumulatedContent);
      if (foundUrl) {
        videoUrl = foundUrl;
      }
    }

    const finalUrl = videoUrl || previewUrl;

    if (!finalUrl) {
      throw new Error('No video URL found in API response');
    }

    console.log(`✅ [Task ${taskId}] Video generated: ${finalUrl}`);

    // Update task as completed
    await prisma.videoTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        videoUrl: finalUrl,
        previewUrl: previewUrl,
        completedAt: new Date()
      }
    });

    // Track successful generation
    try {
      const { trackVideoGeneration } = await import('./analytics-db');
      await trackVideoGeneration(
        task.userId,
        task.model,
        task.mode,
        task.prompt,
        task.duration,
        task.aspectRatio,
        task.creditsUsed
      );
    } catch (trackError) {
      console.error(`⚠️ [Task ${taskId}] Analytics tracking failed:`, trackError);
    }

    console.log(`🎉 [Task ${taskId}] Processing complete!`);

  } catch (error) {
    console.error(`❌ [Task ${taskId}] Error:`, error);

    // Update task as failed
    if (task) {
      try {
        await prisma.videoTask.update({
          where: { id: taskId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date()
          }
        });

        // Refund credits
        console.log(`💳 [Task ${taskId}] Refunding ${task.creditsUsed} credits...`);

        try {
          const refundResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: task.userId,
              amount: task.creditsUsed,
              isRefund: true
            })
          });

          if (refundResponse.ok) {
            console.log(`✅ [Task ${taskId}] Credits refunded successfully`);
          }
        } catch (refundError) {
          console.error(`❌ [Task ${taskId}] Refund failed:`, refundError);
        }

        // Track error
        try {
          const { trackVideoError } = await import('./analytics-db');
          await trackVideoError(
            task.userId,
            task.model,
            task.mode,
            'api_error',
            error.message,
            task.creditsUsed
          );
        } catch (trackError) {
          console.error(`⚠️ [Task ${taskId}] Error tracking failed:`, trackError);
        }

      } catch (updateError) {
        console.error(`❌ [Task ${taskId}] Failed to update task status:`, updateError);
      }
    }
  }
}
