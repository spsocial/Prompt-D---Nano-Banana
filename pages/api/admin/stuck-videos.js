import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check admin authorization (same key as /admin page)
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey
    if (adminKey !== 'nano@admin2024') {
      return res.status(401).json({ error: 'Unauthorized - Invalid admin key' })
    }

    // Get all completed videos with videoUrl (sorted by newest first)
    // Exclude sourceImage to reduce response size (fixes 4MB API limit warning)
    const completedVideos = await prisma.pendingVideo.findMany({
      where: {
        status: 'completed',
        videoUrl: { not: null }
      },
      orderBy: {
        updatedAt: 'desc' // Newest first
      },
      take: 100, // Limit to 100 most recent
      select: {
        id: true,
        taskId: true,
        userId: true,
        model: true,
        mode: true,
        prompt: true,
        videoUrl: true,
        duration: true,
        aspectRatio: true,
        creditsUsed: true,
        status: true,
        error: true,
        createdAt: true,
        updatedAt: true
        // sourceImage excluded - too large for API response
      }
    })

    // Get pending videos (still processing)
    const pendingVideos = await prisma.pendingVideo.findMany({
      where: {
        status: { in: ['pending', 'processing'] }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        taskId: true,
        userId: true,
        model: true,
        mode: true,
        prompt: true,
        videoUrl: true,
        duration: true,
        aspectRatio: true,
        creditsUsed: true,
        status: true,
        error: true,
        createdAt: true,
        updatedAt: true
        // sourceImage excluded - too large for API response
      }
    })

    // Get failed videos
    const failedVideos = await prisma.pendingVideo.findMany({
      where: {
        status: 'failed'
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        taskId: true,
        userId: true,
        model: true,
        mode: true,
        prompt: true,
        videoUrl: true,
        duration: true,
        aspectRatio: true,
        creditsUsed: true,
        status: true,
        error: true,
        createdAt: true,
        updatedAt: true
        // sourceImage excluded - too large for API response
      }
    })

    return res.status(200).json({
      success: true,
      stats: {
        completed: completedVideos.length,
        pending: pendingVideos.length,
        failed: failedVideos.length
      },
      videos: {
        completed: completedVideos,
        pending: pendingVideos,
        failed: failedVideos
      }
    })

  } catch (error) {
    console.error('Admin stuck videos error:', error)
    return res.status(500).json({
      error: 'Failed to fetch stuck videos',
      details: error.message
    })
  } finally {
    await prisma.$disconnect()
  }
}
