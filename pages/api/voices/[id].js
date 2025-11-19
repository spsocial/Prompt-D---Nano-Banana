// API endpoint for managing individual voice (GET, PUT, DELETE)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ Voice ID'
      })
    }

    // GET - ดึงข้อมูลเสียงเดียว
    if (req.method === 'GET') {
      const voice = await prisma.voice.findUnique({
        where: { id }
      })

      if (!voice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบเสียงนี้'
        })
      }

      return res.status(200).json({
        success: true,
        voice
      })
    }

    // PUT - แก้ไขข้อมูลเสียง
    if (req.method === 'PUT') {
      const { name, gender, description, previewUrl, isActive, sortOrder } = req.body

      const voice = await prisma.voice.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(gender && { gender }),
          ...(description !== undefined && { description }),
          ...(previewUrl !== undefined && { previewUrl }),
          ...(isActive !== undefined && { isActive }),
          ...(sortOrder !== undefined && { sortOrder })
        }
      })

      return res.status(200).json({
        success: true,
        message: 'อัปเดตเสียงสำเร็จ',
        voice
      })
    }

    // DELETE - ลบเสียง
    if (req.method === 'DELETE') {
      await prisma.voice.delete({
        where: { id }
      })

      return res.status(200).json({
        success: true,
        message: 'ลบเสียงสำเร็จ'
      })
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in voice API:', error)

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเสียงนี้'
      })
    }

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    })
  } finally {
    await prisma.$disconnect()
  }
}
