// API endpoint for checking video task status from KIE.AI
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    // Get KIE.AI API key
    const kieApiKey = process.env.KIE_API_KEY;
    if (!kieApiKey) {
      return res.status(500).json({ error: 'KIE.AI API key not configured' });
    }

    // Find pending video in database
    const pendingVideo = await prisma.pendingVideo.findUnique({
      where: { taskId }
    });

    if (!pendingVideo) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If already completed or failed, return cached result
    if (pendingVideo.status === 'completed' || pendingVideo.status === 'failed') {
      return res.status(200).json({
        success: true,
        status: pendingVideo.status,
        videoUrl: pendingVideo.videoUrl,
        error: pendingVideo.error,
        updatedAt: pendingVideo.updatedAt
      });
    }

    // Check status from KIE.AI
    console.log(`🔍 Checking status for task: ${taskId}`);
    const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${kieApiKey}`
      }
    });

    if (!statusResponse.ok) {
      console.error('❌ Failed to check KIE.AI status');
      return res.status(500).json({ error: 'Failed to check task status' });
    }

    const statusData = await statusResponse.json();

    // Extract state
    const state = statusData.state ||
                  statusData.status ||
                  statusData.data?.state ||
                  statusData.data?.status;

    console.log(`📊 Task ${taskId} state: ${state}`);

    let updateData = {
      lastChecked: new Date()
    };

    // Check if completed
    if (state === 'completed' || state === 'success' || state === 'SUCCESS' || state === '3') {
      // Extract video URL
      const resultJson = statusData.resultJson ||
                        statusData.result ||
                        statusData.output ||
                        statusData.data?.resultJson ||
                        statusData.data?.result;

      let videoUrl = null;

      if (resultJson) {
        if (typeof resultJson === 'string') {
          try {
            const parsed = JSON.parse(resultJson);
            if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
              videoUrl = parsed.resultUrls[0];
            } else {
              videoUrl = parsed.video_url || parsed.videoUrl || parsed.url || parsed.videoSrc;
            }
          } catch (e) {
            videoUrl = resultJson;
          }
        } else {
          if (resultJson.resultUrls && Array.isArray(resultJson.resultUrls) && resultJson.resultUrls.length > 0) {
            videoUrl = resultJson.resultUrls[0];
          } else {
            videoUrl = resultJson.video_url || resultJson.videoUrl || resultJson.url || resultJson.videoSrc;
          }
        }
      }

      if (!videoUrl) {
        videoUrl = statusData.video_url || statusData.videoUrl || statusData.url;
      }

      if (videoUrl) {
        updateData.status = 'completed';
        updateData.videoUrl = videoUrl;
        console.log(`✅ Task completed: ${videoUrl}`);
      } else {
        updateData.status = 'failed';
        updateData.error = 'Video URL not found in response';
        console.error('❌ No video URL found');
      }

    } else if (state === 'failed' || state === 'error' || state === 'FAILED' || state === 'ERROR') {
      updateData.status = 'failed';
      updateData.error = statusData.error || statusData.errorMessage || 'Task failed';
      console.error(`❌ Task failed: ${updateData.error}`);

    } else if (state === 'processing' || state === 'pending' || state === 'PROCESSING' || state === 'PENDING') {
      updateData.status = 'processing';
      console.log('⏳ Task still processing...');
    }

    // Update database
    const updatedVideo = await prisma.pendingVideo.update({
      where: { taskId },
      data: updateData
    });

    // If completed successfully, track the video generation
    if (updatedVideo.status === 'completed' && updatedVideo.videoUrl) {
      try {
        await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/track-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'success',
            data: {
              userId: updatedVideo.userId,
              model: updatedVideo.model,
              mode: updatedVideo.mode,
              prompt: updatedVideo.prompt || 'Pending task completed',
              duration: updatedVideo.duration,
              aspectRatio: updatedVideo.aspectRatio,
              creditsUsed: updatedVideo.creditsUsed,
              apiCost: 5.1 // KIE Sora 2 cost
            }
          })
        });
        console.log('📊 Video generation tracked successfully');
      } catch (trackError) {
        console.error('⚠️ Failed to track video generation:', trackError);
      }
    }

    return res.status(200).json({
      success: true,
      status: updatedVideo.status,
      videoUrl: updatedVideo.videoUrl,
      error: updatedVideo.error,
      updatedAt: updatedVideo.updatedAt
    });

  } catch (error) {
    console.error('Error checking video task:', error);
    return res.status(500).json({
      error: 'Failed to check video task',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
