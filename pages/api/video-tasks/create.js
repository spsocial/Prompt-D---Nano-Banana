// API endpoint for creating pending video tasks
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      taskId,
      model,
      mode,
      prompt,
      sourceImage,
      duration,
      aspectRatio,
      creditsUsed
    } = req.body;

    // Validate required fields
    if (!userId || !taskId || !model || !mode || !duration || !aspectRatio || !creditsUsed) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create pending video task
    const pendingVideo = await prisma.pendingVideo.create({
      data: {
        userId,
        taskId,
        model,
        mode,
        prompt: prompt || null,
        sourceImage: sourceImage || null,
        duration: parseInt(duration),
        aspectRatio,
        creditsUsed: parseInt(creditsUsed),
        status: 'processing', // Set to processing since task is already created on KIE.AI
      }
    });

    console.log(`✅ Created pending video task: ${taskId} for user: ${userId}`);

    return res.status(200).json({
      success: true,
      pendingVideo: {
        id: pendingVideo.id,
        taskId: pendingVideo.taskId,
        status: pendingVideo.status,
        createdAt: pendingVideo.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating pending video task:', error);
    return res.status(500).json({
      error: 'Failed to create pending video task',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
