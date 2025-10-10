// API endpoint to create async video generation task
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Import the video generation logic
import { generateVideoBackground } from '../../../lib/video-processor';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      prompt,
      image,
      model,
      duration,
      resolution,
      aspectRatio,
      creditsUsed
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either prompt or image is required' });
    }

    console.log(`🎬 Creating video task for user ${userId}, model: ${model}`);

    // Create task in database
    const task = await prisma.videoTask.create({
      data: {
        userId,
        model,
        mode: image ? 'image-to-video' : 'text-to-video',
        prompt,
        imageData: image,
        duration,
        resolution,
        aspectRatio,
        creditsUsed,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    });

    console.log(`✅ Task created with ID: ${task.id}`);

    // Start background processing (fire-and-forget)
    // Don't await - return taskId immediately
    generateVideoBackground(task.id).catch(err => {
      console.error(`❌ Background processing error for task ${task.id}:`, err);
    });

    // Return task ID immediately
    return res.status(200).json({
      success: true,
      taskId: task.id,
      status: 'pending',
      message: 'Video generation started. Poll /api/video-task/[id] for status.'
    });

  } catch (error) {
    console.error('Error creating video task:', error);
    return res.status(500).json({
      error: 'Failed to create video task',
      details: error.message
    });
  }
}
