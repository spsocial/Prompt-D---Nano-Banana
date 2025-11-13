// API endpoint for listing user's pending video tasks
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get all pending/processing tasks for the user (not completed/failed)
    const pendingTasks = await prisma.pendingVideo.findMany({
      where: {
        userId,
        status: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        taskId: true,
        model: true,
        mode: true,
        prompt: true,
        duration: true,
        aspectRatio: true,
        creditsUsed: true,
        status: true,
        createdAt: true,
        lastChecked: true
      }
    });

    // Get recently completed tasks (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completedTasks = await prisma.pendingVideo.findMany({
      where: {
        userId,
        status: 'completed',
        updatedAt: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        taskId: true,
        model: true,
        mode: true,
        prompt: true,
        duration: true,
        aspectRatio: true,
        creditsUsed: true,
        status: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Get failed tasks (last 24 hours)
    const failedTasks = await prisma.pendingVideo.findMany({
      where: {
        userId,
        status: 'failed',
        updatedAt: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        taskId: true,
        model: true,
        mode: true,
        prompt: true,
        duration: true,
        aspectRatio: true,
        creditsUsed: true,
        status: true,
        error: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      success: true,
      pending: pendingTasks,
      completed: completedTasks,
      failed: failedTasks,
      counts: {
        pending: pendingTasks.length,
        completed: completedTasks.length,
        failed: failedTasks.length
      }
    });

  } catch (error) {
    console.error('Error listing video tasks:', error);
    return res.status(500).json({
      error: 'Failed to list video tasks',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
