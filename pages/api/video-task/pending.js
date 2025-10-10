// API endpoint to get all pending/processing tasks for a user
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

    // Fetch all pending or processing tasks for this user
    const tasks = await prisma.videoTask.findMany({
      where: {
        userId,
        status: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Limit to recent 10 tasks
    });

    return res.status(200).json({
      tasks: tasks.map(task => ({
        taskId: task.id,
        status: task.status,
        model: task.model,
        mode: task.mode,
        createdAt: task.createdAt,
        prompt: task.prompt?.substring(0, 100) // First 100 chars only
      }))
    });

  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    return res.status(500).json({
      error: 'Failed to fetch pending tasks',
      details: error.message
    });
  }
}
