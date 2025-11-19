// API endpoint for managing voices (GET all, POST new)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    // GET - ดึงรายการเสียงทั้งหมด
    if (req.method === 'GET') {
      const { provider, gender, activeOnly } = req.query

      const where = {}
      if (provider) where.provider = provider
      if (gender) where.gender = gender
      if (activeOnly === 'true') where.isActive = true

      const voices = await prisma.voice.findMany({
        where,
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      return res.status(200).json({
        success: true,
        voices
      })
    }

    // POST - เพิ่มเสียงใหม่
    if (req.method === 'POST') {
      const { voiceId, name, provider, gender, description, previewUrl, sortOrder } = req.body

      // Validation
      if (!voiceId || !name || !gender) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอก Voice ID, ชื่อ และเพศ'
        })
      }

      // Check if voiceId already exists
      const existing = await prisma.voice.findUnique({
        where: { voiceId }
      })

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Voice ID นี้มีอยู่ในระบบแล้ว'
        })
      }

      // Create new voice
      const voice = await prisma.voice.create({
        data: {
          voiceId,
          name,
          provider: provider || 'elevenlabs',
          gender,
          description,
          previewUrl,
          sortOrder: sortOrder || 0,
          isActive: true
        }
      })

      return res.status(201).json({
        success: true,
        message: 'เพิ่มเสียงสำเร็จ',
        voice
      })
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in voices API:', error)
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    })
  } finally {
    await prisma.$disconnect()
  }
}
