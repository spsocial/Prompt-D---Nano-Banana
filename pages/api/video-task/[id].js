// API endpoint to check video task status
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Fetch task from database
    const task = await prisma.videoTask.findUnique({
      where: { id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Return task status
    return res.status(200).json({
      taskId: task.id,
      status: task.status,
      videoUrl: task.videoUrl,
      previewUrl: task.previewUrl,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      expiresAt: task.expiresAt,
      // Include task details for UI
      model: task.model,
      mode: task.mode,
      duration: task.duration,
      resolution: task.resolution,
      aspectRatio: task.aspectRatio
    });

  } catch (error) {
    console.error('Error fetching task status:', error);
    return res.status(500).json({
      error: 'Failed to fetch task status',
      details: error.message
    });
  }
}
